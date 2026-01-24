/**
 * GET /api/schools/[id]/fit-score
 * Get fit score for a school
 * ACCESSIBLE: Athletes (owners) and Parents (read-only via account link)
 */

import { defineEventHandler, getRouterParam, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import type { Database } from "~/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check if user has access to school (either owner or parent link)
 */
async function hasAccessToSchool(
  userId: string,
  schoolId: string,
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  // Check if user is the owner
  const { data: ownedSchool } = await supabase
    .from("schools")
    .select("id")
    .eq("id", schoolId)
    .eq("user_id", userId)
    .single();

  if (ownedSchool) {
    return true;
  }

  // Check if user is a parent with access to the school owner (athlete)
  const { data: school } = await supabase
    .from("schools")
    .select("user_id")
    .eq("id", schoolId)
    .single();

  if (!school) {
    return false;
  }

  // Check if current user is a parent linked to the school owner
  const { data: link } = await supabase
    .from("account_links")
    .select("id")
    .eq("parent_user_id", userId)
    .eq("player_user_id", school.user_id)
    .eq("status", "accepted")
    .single();

  return !!link;
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const schoolId = getRouterParam(event, "id");

  if (!schoolId) {
    throw createError({
      statusCode: 400,
      statusMessage: "School ID is required",
    });
  }

  const supabase = createServerSupabaseClient();

  try {
    // Check if user has access to this school
    const hasAccess = await hasAccessToSchool(user.id, schoolId, supabase);

    if (!hasAccess) {
      throw createError({
        statusCode: 404,
        statusMessage: "School not found",
      });
    }

    // Get school fit score data
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("id, user_id, name, fit_score, fit_score_data")
      .eq("id", schoolId)
      .single();

    if (schoolError || !school) {
      throw createError({
        statusCode: 404,
        statusMessage: "School not found",
      });
    }

    // Log parent view if applicable
    const role = await getUserRole(user.id, supabase);
    if (role === "parent") {
      const schoolData = school as unknown as Record<string, any>;
      await supabase.from("parent_view_logs").insert({
        parent_user_id: user.id,
        athlete_id: schoolData?.user_id,
        viewed_item_type: "fit_score",
        viewed_item_id: schoolId,
      });
    }

    // Return fit score and breakdown with proper type safety
    const schoolName = (school as any)?.name || "";
    const fitScore = (school as any)?.fit_score || null;
    const fitScoreData = (school as any)?.fit_score_data || null;

    return {
      success: true,
      data: {
        schoolId,
        schoolName,
        fitScore: fitScore || null,
        fitScoreData: fitScoreData || null,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    const message =
      err instanceof Error ? err.message : "Failed to fetch fit score";
    console.error("Fit score fetch error:", err);
    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
