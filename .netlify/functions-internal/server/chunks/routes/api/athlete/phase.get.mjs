import { d as defineEventHandler, a as createError } from '../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../_/supabase.mjs';
import { r as requireAuth } from '../../../_/auth.mjs';
import { c as calculatePhase, g as getMilestoneProgress, a as canAdvancePhase } from '../../../_/phaseCalculation.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const phase_get = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  try {
    const { data: userData, error: userError } = await supabase.from("users").select("current_phase").eq("id", user.id).single();
    if (userError) {
      console.error("Error fetching user phase:", userError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch user phase"
      });
    }
    const { data: athleteTasksData, error: tasksError } = await supabase.from("athlete_task").select("task_id, status").eq("athlete_id", user.id).eq("status", "completed");
    if (tasksError) {
      console.error("Error fetching athlete tasks:", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks"
      });
    }
    const completedTaskIds = athleteTasksData == null ? void 0 : athleteTasksData.map((at) => at.task_id).filter(Boolean);
    const currentPhaseValue = userData == null ? void 0 : userData.current_phase;
    let currentPhase = typeof currentPhaseValue === "string" ? currentPhaseValue : "freshman";
    const calculatedPhase = calculatePhase(completedTaskIds, false);
    if (calculatedPhase > currentPhase) {
      currentPhase = calculatedPhase;
    }
    const progress = getMilestoneProgress(currentPhase, completedTaskIds);
    const canAdvance = canAdvancePhase(currentPhase, completedTaskIds);
    const response = {
      phase: currentPhase,
      milestoneProgress: progress,
      canAdvance
    };
    return response;
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
    console.error("Error in GET /api/athlete/phase:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch phase"
    });
  }
});

export { phase_get as default };
//# sourceMappingURL=phase.get.mjs.map
