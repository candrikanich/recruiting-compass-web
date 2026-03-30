/**
 * POST /api/account/cancel-deletion
 * Cancels a pending account deletion by clearing deletion_requested_at.
 * Only valid within the 30-day window before hard deletion runs.
 */

import { defineEventHandler, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "account/cancel-deletion");
  try {
    const user = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    // Verify deletion is actually pending
    const { data: userData } = await supabase
      .from("users")
      .select("deletion_requested_at")
      .eq("id", user.id)
      .single();

    if (!userData?.deletion_requested_at) {
      throw createError({
        statusCode: 400,
        statusMessage: "No pending deletion to cancel",
      });
    }

    const { error } = await supabase
      .from("users")
      .update({ deletion_requested_at: null })
      .eq("id", user.id);

    if (error) {
      logger.error("Failed to cancel deletion", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to cancel account deletion",
      });
    }

    logger.info("Account deletion cancelled", { userId: user.id });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to cancel account deletion", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to cancel account deletion",
    });
  }
});
