/**
 * API Endpoint: Get preference history for a category
 * GET /api/user/preferences/[category]/history
 *
 * Returns preference change history for a specific category with pagination
 * Query params: ?limit=50&offset=0
 */

import { defineEventHandler, getQuery } from "h3";
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
    const query = getQuery(event);
    const limit = Math.min(Number(query.limit) || 50, 100); // Max 100
    const offset = Number(query.offset) || 0;

    const supabase = useSupabaseAdmin();

    // Get total count
    const { count } = await supabase
      .from("preference_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("category", category);

    // Fetch history records
    const { data, error } = await supabase
      .from("preference_history")
      .select("*")
      .eq("user_id", user.id)
      .eq("category", category)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return {
      category,
      data: data || [],
      total: count || 0,
      limit,
      offset,
    };
  } catch (err) {
    console.error(
      `[Preferences History GET] Error fetching history for ${category}:`,
      err,
    );

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch preference history",
    });
  }
});
