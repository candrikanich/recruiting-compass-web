/**
 * GET /api/deadlines
 * Returns the authenticated user's deadlines ordered by deadline_date ASC
 */

import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "deadlines/list");
  try {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.from("user_deadlines")
      .select("*")
      .eq("user_id", user.id)
      .order("deadline_date", { ascending: true });

    if (error) {
      logger.error("Failed to fetch deadlines", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch deadlines",
      });
    }

    return { deadlines: data ?? [] };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error fetching deadlines", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch deadlines",
    });
  }
});
