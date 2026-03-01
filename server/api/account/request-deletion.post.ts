/**
 * POST /api/account/request-deletion
 * Initiates soft deletion of the authenticated user's account.
 * Sets deletion_requested_at to now(); hard delete runs after 30 days via cron.
 */

import { defineEventHandler, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "account/request-deletion");
  try {
    const user = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    const { error } = await supabase
      .from("users")
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      logger.error("Failed to set deletion_requested_at", error);
      throw createError({ statusCode: 500, statusMessage: "Failed to request account deletion" });
    }

    logger.info("Account deletion requested", { userId: user.id });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to request account deletion", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to request account deletion" });
  }
});
