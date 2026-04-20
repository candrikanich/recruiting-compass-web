/**
 * GET /api/account/deletion-status
 * Returns the deletion_requested_at timestamp for the authenticated user.
 */

import { defineEventHandler, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "account/deletion-status");
  try {
    const user = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    const { data, error } = await supabase
      .from("users")
      .select("deletion_requested_at")
      .eq("id", user.id)
      .single();

    if (error) {
      logger.error("Failed to fetch deletion status", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch account status",
      });
    }

    return { deletion_requested_at: data?.deletion_requested_at ?? null };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to fetch deletion status", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch account status",
    });
  }
});
