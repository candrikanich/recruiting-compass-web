import { d as defineEventHandler, a as createError } from '../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../_/supabase.mjs';
import { r as requireAuth } from '../../../_/auth.mjs';
import { c as calculateStatusScoreResult } from '../../../_/statusScoreCalculation.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

function isAthleteStatusData(data) {
  return typeof data === "object" && data !== null && "task_completion_rate" in data && "interaction_frequency_score" in data && "coach_interest_score" in data && "academic_standing_score" in data;
}
async function callGetAthleteStatusRpc(supabase, userId) {
  return supabase.rpc("get_athlete_status", {
    p_user_id: userId
  });
}
const status_get = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  try {
    const { data, error } = await callGetAthleteStatusRpc(supabase, user.id);
    if (error) {
      console.error("Error calling get_athlete_status RPC:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to calculate athlete status"
      });
    }
    if (!data || Array.isArray(data) && data.length === 0) {
      throw createError({
        statusCode: 500,
        statusMessage: "No status data returned"
      });
    }
    const statusDataRaw = Array.isArray(data) ? data[0] : data;
    if (!isAthleteStatusData(statusDataRaw)) {
      throw createError({
        statusCode: 500,
        statusMessage: "Invalid status data structure"
      });
    }
    const statusData = statusDataRaw;
    const result = calculateStatusScoreResult({
      taskCompletionRate: statusData.task_completion_rate || 0,
      interactionFrequencyScore: statusData.interaction_frequency_score || 0,
      coachInterestScore: statusData.coach_interest_score || 0,
      academicStandingScore: statusData.academic_standing_score || 0
    });
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized"
      });
    }
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    console.error("Error in GET /api/athlete/status:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch status"
    });
  }
});

export { status_get as default };
//# sourceMappingURL=status.get.mjs.map
