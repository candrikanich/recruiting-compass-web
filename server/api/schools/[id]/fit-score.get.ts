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
 * Check if user has access to school: direct owner, legacy account_links
 * parent, or family-model member of the school's family unit (union of
 * both sharing models during transition — see planning/audit-2026-07-27-findings.md:33).
 */
async function hasAccessToSchool(
  userId: string,
  schoolId: string,
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  // Single query: fetch school with ownership + family info
  const { data: school } = await supabase
    .from("schools")
    .select("id, user_id, family_unit_id")
    .eq("id", schoolId)
    .single();

  if (!school) return false;

  // User is the direct owner — fast path
  if (school.user_id === userId) return true;

  // Legacy path: user is a parent linked to the school's athlete
  const { data: link } = await supabase
    .from("account_links")
    .select("id")
    .eq("parent_user_id", userId)
    .eq("player_user_id", school.user_id)
    .eq("status", "accepted")
    .single();

  if (link) return true;

  // Family-model path: user is a member of the school's family unit
  if (school.family_unit_id) {
    const { data: membership } = await supabase
      .from("family_members")
      .select("id")
      .eq("user_id", userId)
      .eq("family_unit_id", school.family_unit_id)
      .single();

    if (membership) return true;
  }

  return false;
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

    // Get school name
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("id, user_id, name")
      .eq("id", schoolId)
      .single();

    if (schoolError || !school) {
      throw createError({
        statusCode: 404,
        statusMessage: "School not found",
      });
    }

    return {
      success: true,
      data: {
        schoolId,
        schoolName: school.name,
        fitScore: null,
        fitScoreData: null,
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
