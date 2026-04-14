/**
 * POST /api/schools/[id]/enrich
 * Enrich a school's academic_info with College Scorecard data.
 *
 * Step 1 — Search: POST { schoolName?: string }
 *   Returns array of matching schools from Scorecard for user to confirm.
 *   Falls back to school's existing name if schoolName not provided.
 *
 * Step 2 — Confirm: POST { scorecardId: number, confirmed: true }
 *   Merges matched Scorecard data into school's academic_info JSONB and saves.
 *
 * RESTRICTED: Athletes only (parents cannot mutate)
 */

import { defineEventHandler, createError, readBody } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";
import {
  searchCollegeScorecard,
  scorecardToAcademicInfo,
  type ScorecardSchool,
} from "~/server/utils/collegeScorecard";
import type { SchoolAcademicInfo } from "~/types/schoolFit";

type EnrichSearchBody = { schoolName?: string; confirmed?: false };
type EnrichConfirmBody = { scorecardId: number; confirmed: true };
type EnrichBody = EnrichSearchBody | EnrichConfirmBody;

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "schools/enrich");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  await assertNotParent(user.id, supabase);

  const schoolId = requireUuidParam(event, "id");
  const body = await readBody<EnrichBody>(event);

  // Verify school belongs to user's family unit
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    throw createError({ statusCode: 404, statusMessage: "School not found" });
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("id, name, academic_info, family_unit_id")
    .eq("id", schoolId)
    .eq("family_unit_id", membership.family_unit_id)
    .single();

  if (schoolError || !school) {
    throw createError({ statusCode: 404, statusMessage: "School not found" });
  }

  const schoolName = (school as { name: string }).name;

  // Step 1: Search Scorecard
  if (!body.confirmed) {
    const searchName = (body as EnrichSearchBody).schoolName || schoolName;
    if (!searchName) {
      throw createError({
        statusCode: 400,
        statusMessage: "School name required",
      });
    }

    logger.info("Searching College Scorecard", { schoolName: searchName });

    try {
      const { results } = await searchCollegeScorecard(searchName);

      return {
        success: true,
        data: {
          matches: results.map((r: ScorecardSchool) => ({
            scorecardId: r.id,
            name: r["school.name"],
            state: r["school.state"],
            city: r["school.city"],
            studentSize: r["latest.student.size"],
            admissionRate: r["latest.admissions.admission_rate.overall"],
          })),
          instruction:
            "Select the correct school and confirm to save academic data.",
        },
      };
    } catch (err) {
      logger.error("College Scorecard search failed", err);
      throw createError({
        statusCode: 502,
        statusMessage: "Failed to search College Scorecard. Please try again.",
      });
    }
  }

  // Step 2: Confirm and save
  const { scorecardId } = body as EnrichConfirmBody;

  logger.info("Confirming Scorecard data", { schoolId, scorecardId });

  try {
    const { results } = await searchCollegeScorecard(schoolName);
    const match = results.find((r: ScorecardSchool) => r.id === scorecardId);

    if (!match) {
      throw createError({
        statusCode: 404,
        statusMessage: "School not found in College Scorecard",
      });
    }

    const enrichedData = scorecardToAcademicInfo(match);

    const existingInfo =
      typeof school.academic_info === "object" && school.academic_info !== null
        ? (school.academic_info as SchoolAcademicInfo)
        : {};

    const mergedInfo: SchoolAcademicInfo = { ...existingInfo, ...enrichedData };

    const { error: updateError } = await supabase
      .from("schools")
      .update({
        academic_info: mergedInfo as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        updated_at: new Date().toISOString(),
      })
      .eq("id", schoolId);

    if (updateError) {
      logger.error("Failed to save Scorecard data", updateError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to save academic data",
      });
    }

    logger.info("School enriched with Scorecard data", {
      schoolId,
      scorecardId,
    });

    return {
      success: true,
      data: {
        schoolId,
        academicInfo: mergedInfo,
        message: "Academic data updated from College Scorecard.",
      },
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Enrich confirm failed", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to enrich school data",
    });
  }
});
