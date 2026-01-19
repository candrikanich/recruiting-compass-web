import { d as defineEventHandler, g as getRouterParam, a as createError } from '../../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../../_/supabase.mjs';
import { r as requireAuth } from '../../../../_/auth.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const fitScore_get = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const schoolId = getRouterParam(event, "id");
  if (!schoolId) {
    throw createError({
      statusCode: 400,
      statusMessage: "School ID is required"
    });
  }
  const supabase = createServerSupabaseClient();
  try {
    const { data: school, error: schoolError } = await supabase.from("schools").select("id, user_id, name, fit_score, fit_score_data").eq("id", schoolId).eq("user_id", user.id).single();
    if (schoolError || !school) {
      throw createError({
        statusCode: 404,
        statusMessage: "School not found"
      });
    }
    const schoolName = (school == null ? void 0 : school.name) || "";
    const fitScore = (school == null ? void 0 : school.fit_score) || null;
    const fitScoreData = (school == null ? void 0 : school.fit_score_data) || null;
    return {
      success: true,
      data: {
        schoolId,
        schoolName,
        fitScore: fitScore || null,
        fitScoreData: fitScoreData || null
      }
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Failed to fetch fit score";
    console.error("Fit score fetch error:", err);
    throw createError({
      statusCode: 500,
      statusMessage: message
    });
  }
});

export { fitScore_get as default };
//# sourceMappingURL=fit-score.get.mjs.map
