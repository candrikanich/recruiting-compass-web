/**
 * API Endpoint: Get user preferences by category
 * GET /api/user/preferences/[category]
 *
 * Returns stored preferences for a specific category (e.g., "filters", "session", "display")
 * If no preferences exist for the category, returns empty object
 */

import { defineEventHandler } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
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

    // Fetch preferences for this user and category
    const { data, error } = await supabase
      .from("user_preferences")
      .select("data, updated_at")
      .eq("user_id", user.id)
      .eq("category", category)
      .single();

    if (error && error.code === "PGRST116") {
      // No preferences found for this category - return empty
      return {
        category,
        data: {},
        exists: false,
      };
    }

    if (error) {
      throw error;
    }

    return {
      category,
      data: data?.data || {},
      exists: true,
      updatedAt: data?.updated_at,
    };
  } catch (err) {
    console.error(
      `[Preferences GET] Error fetching ${category} for user ${user.id}:`,
      err,
    );

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch preferences",
    });
  }
});
