/**
 * GET /api/schools/[id]/fit-score
 * Get fit score for a school
 * ACCESSIBLE: Athletes (owners) and Parents (read-only via account link)
 */

import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";
import type { Database } from "~/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check if user has access to school (either owner or parent link).
 * Uses a single query to fetch school id + user_id, then conditionally
 * checks the parent link — reducing sequential queries from 3 to max 2.
 */
async function hasAccessToSchool(
  userId: string,
  schoolId: string,
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  // Single query: fetch school with ownership info
  const { data: school } = await supabase
    .from("schools")
    .select("id, user_id")
    .eq("id", schoolId)
    .single();

  if (!school) return false;

  // User is the direct owner — fast path
  if (school.user_id === userId) return true;

  // Check if user is a parent linked to the school's athlete
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
  const logger = useLogger(event, "schools/fit-score");
  const user = await requireAuth(event);
  const schoolId = requireUuidParam(event, "id");

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

    // Return fit score and breakdown with proper type safety
    const schoolName = (school as { name: string })?.name || "";
    const fitScore =
      (school as { fit_score: number | null })?.fit_score || null;
    const fitScoreData =
      (school as { fit_score_data: unknown | null })?.fit_score_data || null;

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
    logger.error("Fit score fetch error", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch fit score",
    });
  }
});
