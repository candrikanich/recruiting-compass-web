/**
 * API Endpoint: Delete user preferences by category
 * DELETE /api/user/preferences/[category]
 *
 * Deletes preferences for a specific category
 * Returns success status
 */

import { defineEventHandler } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "user/preferences");
  // Require authentication
  const user = await requireAuth(event);
  const category = event.context.params?.category;

  if (!category || typeof category !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Category parameter is required",
    });
  }

  try {
    const supabase = useSupabaseAdmin();

    // Delete preferences for this user and category
    const { error } = await supabase
      .from("user_preferences")
      .delete()
      .eq("user_id", user.id)
      .eq("category", category);

    if (error) {
      throw error;
    }

    return {
      category,
      success: true,
      message: "Preferences deleted successfully",
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Error deleting preferences", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete preferences",
    });
  }
});
