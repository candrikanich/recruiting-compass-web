/**
 * GET /api/athlete-tasks
 * Fetch current athlete's task statuses
 */

import { defineEventHandler, getQuery } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { resolveTargetAthleteId } from "~/server/utils/athleteAccess";
import { useLogger } from "~/server/utils/logger";
import type { AthleteTask } from "~/types/timeline";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "athlete-tasks");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  try {
    const query = getQuery(event);

    // Resolve whose task-completion rows to return. Defaults to the caller; a
    // parent may pass ?athleteId to view a linked athlete — authorized by
    // shared family unit (same pattern as GET /api/tasks).
    const athleteId = await resolveTargetAthleteId(
      event,
      user.id,
      query.athleteId as string | undefined,
    );

    const { data, error } = await supabase
      .from("athlete_task")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Supabase error fetching athlete tasks", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks",
      });
    }

    return data as AthleteTask[];
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Rethrow errors that already carry an intentional status (e.g. the 403
    // from resolveTargetAthleteId when the caller isn't in the athlete's
    // family unit) instead of masking them as a generic 500.
    if (err instanceof Error && "statusCode" in err) throw err;

    logger.error("Error in GET /api/athlete-tasks", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch athlete tasks",
    });
  }
});
