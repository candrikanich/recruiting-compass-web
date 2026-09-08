/**
 * POST /api/suggestions/trigger-update
 * Trigger suggestion re-evaluation (called after interactions logged).
 * Family-shared profile: both the athlete and their parent can trigger
 * this, always scoped to the athlete's own data (resolveAthleteId).
 */

import { defineEventHandler, readBody, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { resolveAthleteId } from "~/server/utils/resolveAthleteId";
import { useLogger } from "~/server/utils/logger";
import { triggerSuggestionUpdate } from "~/server/utils/triggerSuggestionUpdate";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "suggestions/trigger-update");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const athleteId = await resolveAthleteId(user.id, supabase);

  try {
    const body = await readBody<{
      reason: "profile_change" | "interaction_logged" | "daily_refresh";
      interactionSchoolId?: string;
      interactionCoachId?: string;
    }>(event);

    const { reason, interactionSchoolId, interactionCoachId } = body;

    if (
      !reason ||
      !["profile_change", "interaction_logged", "daily_refresh"].includes(
        reason,
      )
    ) {
      throw createError({
        statusCode: 400,
        message: "Invalid trigger reason",
      });
    }

    logger.info("Triggering suggestion update", { reason });

    const result = await triggerSuggestionUpdate(supabase, athleteId, reason, {
      interactionSchoolId,
      interactionCoachId,
    });

    return result;
  } catch (err: unknown) {
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    logger.error("Failed to trigger suggestion update", err);

    throw createError({
      statusCode: 500,
      message: "Failed to trigger suggestion update",
    });
  }
});
