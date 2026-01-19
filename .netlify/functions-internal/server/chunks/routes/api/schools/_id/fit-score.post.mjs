import { d as defineEventHandler, g as getRouterParam, a as createError, r as readBody } from '../../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../../_/supabase.mjs';
import { r as requireAuth, a as assertNotParent } from '../../../../_/auth.mjs';
import { a as calculateFitScore } from '../../../../_/fitScoreCalculation.mjs';
import { a as logCRUD, l as logError } from '../../../../_/auditLog.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const fitScore_post = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  await assertNotParent(user.id, supabase);
  const schoolId = getRouterParam(event, "id");
  if (!schoolId || typeof schoolId !== "string" || schoolId.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valid school ID is required"
    });
  }
  let body = {};
  try {
    body = await readBody(event);
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body - must be valid JSON"
    });
  }
  if (body.athleticFit !== void 0 && (typeof body.athleticFit !== "number" || body.athleticFit < 0 || body.athleticFit > 40)) {
    throw createError({
      statusCode: 400,
      statusMessage: "athleticFit must be a number between 0 and 40"
    });
  }
  if (body.academicFit !== void 0 && (typeof body.academicFit !== "number" || body.academicFit < 0 || body.academicFit > 25)) {
    throw createError({
      statusCode: 400,
      statusMessage: "academicFit must be a number between 0 and 25"
    });
  }
  if (body.opportunityFit !== void 0 && (typeof body.opportunityFit !== "number" || body.opportunityFit < 0 || body.opportunityFit > 20)) {
    throw createError({
      statusCode: 400,
      statusMessage: "opportunityFit must be a number between 0 and 20"
    });
  }
  if (body.personalFit !== void 0 && (typeof body.personalFit !== "number" || body.personalFit < 0 || body.personalFit > 15)) {
    throw createError({
      statusCode: 400,
      statusMessage: "personalFit must be a number between 0 and 15"
    });
  }
  try {
    const { data: school, error: schoolError } = await supabase.from("schools").select("id, user_id").eq("id", schoolId).eq("user_id", user.id).single();
    if (schoolError || !school) {
      throw createError({
        statusCode: 404,
        statusMessage: "School not found"
      });
    }
    const fitScoreResult = calculateFitScore(body);
    const updateResult = await supabase.from("schools").update({
      fit_score: fitScoreResult.score,
      fit_score_data: fitScoreResult.breakdown,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", schoolId).select().single();
    const { data: updated, error: updateError } = updateResult;
    if (updateError) {
      throw updateError;
    }
    const updatedRecord = updated;
    await logCRUD(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "schools",
      resourceId: schoolId,
      newValues: {
        fit_score: fitScoreResult.score,
        fit_score_data: fitScoreResult.breakdown
      },
      description: `Updated fit score for school (${fitScoreResult.score}/100)`
    });
    return {
      success: true,
      data: {
        schoolId: updatedRecord == null ? void 0 : updatedRecord.id,
        fitScore: fitScoreResult,
        school: updated
      }
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to calculate fit score";
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "schools",
      resourceId: schoolId,
      errorMessage,
      description: "Failed to update fit score"
    });
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    console.error("Fit score calculation error:", err);
    throw createError({
      statusCode: 500,
      statusMessage: errorMessage
    });
  }
});

export { fitScore_post as default };
//# sourceMappingURL=fit-score.post.mjs.map
