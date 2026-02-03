/**
 * POST /api/schools/[id]/fit-score
 * Calculate and update fit score for a school
 * RESTRICTED: Athletes only (parents have read-only access)
 */

import { defineEventHandler, getRouterParam, createError, readBody } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { calculateFitScore } from "~/utils/fitScoreCalculation";
import { logCRUD, logError } from "~/server/utils/auditLog";
import type { FitScoreInputs } from "~/types/timeline";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  // Ensure requesting user is not a parent (mutation restricted)
  await assertNotParent(user.id, supabase);

  const schoolId = getRouterParam(event, "id");

  // Validate school ID is provided
  if (
    !schoolId ||
    typeof schoolId !== "string" ||
    schoolId.trim().length === 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valid school ID is required",
    });
  }

  let body: Partial<FitScoreInputs> = {};
  try {
    body = await readBody(event);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body - must be valid JSON",
    });
  }

  // Validate fit score inputs if provided
  if (
    body.athleticFit !== undefined &&
    (typeof body.athleticFit !== "number" ||
      body.athleticFit < 0 ||
      body.athleticFit > 40)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "athleticFit must be a number between 0 and 40",
    });
  }

  if (
    body.academicFit !== undefined &&
    (typeof body.academicFit !== "number" ||
      body.academicFit < 0 ||
      body.academicFit > 25)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "academicFit must be a number between 0 and 25",
    });
  }

  if (
    body.opportunityFit !== undefined &&
     
    (typeof body.opportunityFit !== "number" ||
      body.opportunityFit < 0 ||
      body.opportunityFit > 20)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "opportunityFit must be a number between 0 and 20",
    });
  }
   

  if (
    body.personalFit !== undefined &&
    (typeof body.personalFit !== "number" ||
      body.personalFit < 0 ||
      body.personalFit > 15)
  ) {
    throw createError({
      statusCode: 400,
       
      statusMessage: "personalFit must be a number between 0 and 15",
    });
  }

  try {
    // Verify school ownership
    const { data: school, error: schoolError } = await supabase
      .from("schools")
       
      .select("id, user_id")
      .eq("id", schoolId)
      .eq("user_id", user.id)
      .single();

    if (schoolError || !school) {
      throw createError({
        statusCode: 404,
        statusMessage: "School not found",
      });
    }

    // Calculate fit score
    const fitScoreResult = calculateFitScore(body);

    // Update school with fit score data
    // Supabase type generation doesn't include custom columns - need to bypass type check
    const updateResult = (await supabase
      .from("schools")
      .update({
        fit_score: fitScoreResult.score,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fit_score_data: fitScoreResult.breakdown as any,
        updated_at: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .eq("id", schoolId)
      .select()
      .single()) as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

    const { data: updated, error: updateError } = updateResult;

    if (updateError) {
      throw updateError;
    }

    const updatedRecord = updated as {
      id: string;
      fit_score: number;
      fit_score_data: unknown;
      updated_at: string;
    };

    // Log successful fit score update
    await logCRUD(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "schools",
      resourceId: schoolId,
      newValues: {
        fit_score: fitScoreResult.score,
        fit_score_data: fitScoreResult.breakdown,
      },
      description: `Updated fit score for school (${fitScoreResult.score}/100)`,
    });

    return {
      success: true,
      data: {
        schoolId: updatedRecord.id,
        fitScore: fitScoreResult,
        school: updated,
      },
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to calculate fit score";

    // Log failed fit score update
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "schools",
      resourceId: schoolId,
      errorMessage,
      description: "Failed to update fit score",
    });

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    console.error("Fit score calculation error:", err);
    throw createError({
      statusCode: 500,
      statusMessage: errorMessage,
    });
  }
});
