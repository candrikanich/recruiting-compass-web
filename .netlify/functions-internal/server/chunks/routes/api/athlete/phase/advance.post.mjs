import { d as defineEventHandler, a as createError } from '../../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../../_/supabase.mjs';
import { a as logCRUD, l as logError } from '../../../../_/auditLog.mjs';
import { r as requireAuth, a as assertNotParent } from '../../../../_/auth.mjs';
import { a as canAdvancePhase, b as getNextPhase, d as buildPhaseMilestoneData } from '../../../../_/phaseCalculation.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const advance_post = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  await assertNotParent(user.id, supabase);
  try {
    const { data: userData, error: userError } = await supabase.from("users").select("current_phase").eq("id", user.id).single();
    if (userError) {
      console.error("Error fetching user phase:", userError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch user phase"
      });
    }
    const userRecord = userData;
    const currentPhase = (userRecord == null ? void 0 : userRecord.current_phase) || "freshman";
    const { data: athleteTasksData, error: tasksError } = await supabase.from("athlete_task").select("task_id").eq("athlete_id", user.id).eq("status", "completed");
    if (tasksError) {
      console.error("Error fetching athlete tasks:", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks"
      });
    }
    const completedTaskIds = (athleteTasksData || []).map(
      (at) => at.task_id
    );
    if (!canAdvancePhase(currentPhase, completedTaskIds)) {
      return {
        success: false,
        phase: currentPhase,
        message: "Cannot advance phase - not all milestones completed"
      };
    }
    const nextPhase = getNextPhase(currentPhase);
    if (!nextPhase) {
      return {
        success: false,
        phase: currentPhase,
        message: "Already at final phase"
      };
    }
    const phaseMilestoneData = buildPhaseMilestoneData(nextPhase, completedTaskIds);
    const updateResult = await supabase.from("users").update({
      current_phase: nextPhase,
      phase_milestone_data: phaseMilestoneData,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", user.id);
    const { error: updateError } = updateResult;
    if (updateError) {
      console.error("Error updating user phase:", updateError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update phase"
      });
    }
    const phaseLabels = {
      freshman: "Freshman Year",
      sophomore: "Sophomore Year",
      junior: "Junior Year",
      senior: "Senior Year",
      committed: "Committed"
    };
    await logCRUD(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "users",
      resourceId: user.id,
      newValues: {
        current_phase: nextPhase
      },
      description: `Advanced to ${phaseLabels[nextPhase]}`
    });
    return {
      success: true,
      phase: nextPhase,
      message: `Congratulations! You've advanced to ${phaseLabels[nextPhase]}!`
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to advance phase";
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "users",
      resourceId: user.id,
      errorMessage,
      description: "Failed to advance phase"
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
    console.error("Error in POST /api/athlete/phase/advance:", err);
    throw createError({
      statusCode: 500,
      statusMessage: errorMessage
    });
  }
});

export { advance_post as default };
//# sourceMappingURL=advance.post.mjs.map
