import { d as defineEventHandler, a as createError } from '../../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../../_/supabase.mjs';
import { a as logCRUD, l as logError } from '../../../../_/auditLog.mjs';
import { r as requireAuth, a as assertNotParent } from '../../../../_/auth.mjs';
import { a as calculateTaskCompletionRate, b as calculateInteractionFrequencyScore, d as calculateCoachInterestScore, e as calculateAcademicStandingScore, c as calculateStatusScoreResult } from '../../../../_/statusScoreCalculation.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const recalculate_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  await assertNotParent(user.id, supabase);
  try {
    const { data: userData, error: userError } = await supabase.from("users").select("current_phase").eq("id", user.id).single();
    if (userError) {
      console.error("Error fetching user:", userError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch user"
      });
    }
    const userRecord = userData;
    const phase = (userRecord == null ? void 0 : userRecord.current_phase) || "freshman";
    const gradeMap = {
      freshman: 9,
      sophomore: 10,
      junior: 11,
      senior: 12,
      committed: 12
    };
    const gradeLevel = gradeMap[phase];
    const { data: requiredTasksData, error: tasksError } = await supabase.from("task").select("id").eq("grade_level", gradeLevel).eq("required", true);
    if (tasksError) {
      console.error("Error fetching required tasks:", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch required tasks"
      });
    }
    const requiredTaskIds = (requiredTasksData || []).map(
      (t) => t.id
    );
    const { data: completedTasksData, error: completedError } = await supabase.from("athlete_task").select("task_id").eq("athlete_id", user.id).eq("status", "completed");
    if (completedError) {
      console.error("Error fetching completed tasks:", completedError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch completed tasks"
      });
    }
    const completedTaskIds = (completedTasksData || []).map(
      (at) => at.task_id
    );
    const taskCompletionRate = calculateTaskCompletionRate(completedTaskIds, requiredTaskIds);
    const { data: schoolsData, error: schoolsError } = await supabase.from("schools").select("id").eq("user_id", user.id);
    const targetSchools = (schoolsData || []).length;
    const { data: interactionsData, error: interactionsError } = await supabase.from("interactions").select("created_at, sentiment").eq("logged_by", user.id).order("created_at", { ascending: false });
    let interactionFrequencyScore = 0;
    let coachInterestScore = 0;
    if (!interactionsError && interactionsData && interactionsData.length > 0) {
      const interactionsRecords = interactionsData;
      const lastInteractionDate = interactionsRecords[0].created_at;
      const daysSinceLastInteraction = Math.floor(
        (Date.now() - new Date(lastInteractionDate).getTime()) / (1e3 * 60 * 60 * 24)
      );
      interactionFrequencyScore = calculateInteractionFrequencyScore(
        lastInteractionDate,
        daysSinceLastInteraction,
        targetSchools
      );
      const interestLevels = interactionsRecords.map((interaction) => {
        var _a2, _b2;
        const sentiment = (_b2 = (_a2 = interaction.sentiment) == null ? void 0 : _a2.toLowerCase) == null ? void 0 : _b2.call(_a2);
        if (sentiment === "positive") {
          return "high";
        } else if (sentiment === "negative") {
          return "low";
        } else {
          return "medium";
        }
      });
      coachInterestScore = calculateCoachInterestScore(
        interestLevels,
        0
      );
    }
    const { data: academicData } = await supabase.from("users").select("gpa, sat_score, act_score, ncaa_eligibility_status").eq("id", user.id).single();
    const academicRecord = academicData;
    const academicStandingScore = calculateAcademicStandingScore(
      (_a = academicRecord == null ? void 0 : academicRecord.gpa) != null ? _a : null,
      {
        sat: (_b = academicRecord == null ? void 0 : academicRecord.sat_score) != null ? _b : void 0,
        act: (_c = academicRecord == null ? void 0 : academicRecord.act_score) != null ? _c : void 0
      },
      (_d = academicRecord == null ? void 0 : academicRecord.ncaa_eligibility_status) != null ? _d : "not_started",
      []
    );
    const result = calculateStatusScoreResult({
      taskCompletionRate,
      interactionFrequencyScore,
      coachInterestScore,
      academicStandingScore
    });
    const updateResult = await supabase.from("users").update({
      status_score: result.score,
      status_label: result.label,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", user.id);
    const { error: updateError } = updateResult;
    if (updateError) {
      console.error("Error updating status score:", updateError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to save status score"
      });
    }
    await logCRUD(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "users",
      resourceId: user.id,
      newValues: {
        status_score: result.score,
        status_label: result.label
      },
      description: `Recalculated status score (${result.label} - ${result.score}/100)`
    });
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to recalculate status";
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "users",
      resourceId: user.id,
      errorMessage,
      description: "Failed to recalculate status score"
    });
    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized"
      });
    }
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    console.error("Error in POST /api/athlete/status/recalculate:", err);
    throw createError({
      statusCode: 500,
      statusMessage: errorMessage
    });
  }
});

export { recalculate_post as default };
//# sourceMappingURL=recalculate.post.mjs.map
