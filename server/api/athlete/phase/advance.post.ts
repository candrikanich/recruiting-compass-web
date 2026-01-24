/**
 * POST /api/athlete/phase/advance
 * Attempt to advance athlete to next phase
 * RESTRICTED: Athletes only (parents have read-only access)
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { logCRUD, logError } from "~/server/utils/auditLog";
import type { Phase } from "~/types/timeline";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import {
  canAdvancePhase,
  getNextPhase,
  buildPhaseMilestoneData,
} from "~/utils/phaseCalculation";

interface AdvancePhaseResponse {
  success: boolean;
  phase: Phase;
  message: string;
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  // Ensure requesting user is not a parent (mutation restricted)
  await assertNotParent(user.id, supabase);

  try {
    // Get current phase
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("current_phase")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.error("Error fetching user phase:", userError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch user phase",
      });
    }

    const userRecord = userData as { current_phase?: Phase };
    const currentPhase: Phase = userRecord?.current_phase || "freshman";

    // Fetch completed tasks
    const { data: athleteTasksData, error: tasksError } = await supabase
      .from("athlete_task")
      .select("task_id")
      .eq("athlete_id", user.id)
      .eq("status", "completed");

    if (tasksError) {
      console.error("Error fetching athlete tasks:", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks",
      });
    }

    const completedTaskIds = (athleteTasksData || []).map(
      (at: { task_id: string }) => at.task_id,
    );

    // Check if can advance
    if (!canAdvancePhase(currentPhase, completedTaskIds)) {
      return {
        success: false,
        phase: currentPhase,
        message: "Cannot advance phase - not all milestones completed",
      } as AdvancePhaseResponse;
    }

    // Get next phase
    const nextPhase = getNextPhase(currentPhase);

    if (!nextPhase) {
      return {
        success: false,
        phase: currentPhase,
        message: "Already at final phase",
      } as AdvancePhaseResponse;
    }

    // Update user's phase
    const phaseMilestoneData = buildPhaseMilestoneData(
      nextPhase,
      completedTaskIds,
    );

    // Supabase type generation doesn't include custom columns - need to bypass type check
    const updateResult = await supabase
      .from("users")
      // @ts-expect-error - custom columns (current_phase, phase_milestone_data) not in Supabase types
      .update({
        current_phase: nextPhase,
        phase_milestone_data: phaseMilestoneData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    const { error: updateError } = updateResult;

    if (updateError) {
      console.error("Error updating user phase:", updateError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update phase",
      });
    }

    const phaseLabels: Record<Phase, string> = {
      freshman: "Freshman Year",
      sophomore: "Sophomore Year",
      junior: "Junior Year",
      senior: "Senior Year",
      committed: "Committed",
    };

    // Log successful phase advance
    await logCRUD(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "users",
      resourceId: user.id,
      newValues: {
        current_phase: nextPhase,
      },
      description: `Advanced to ${phaseLabels[nextPhase]}`,
    });

    return {
      success: true,
      phase: nextPhase,
      message: `Congratulations! You've advanced to ${phaseLabels[nextPhase]}!`,
    } as AdvancePhaseResponse;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to advance phase";

    // Log failed phase advance
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "users",
      resourceId: user.id,
      errorMessage,
      description: "Failed to advance phase",
    });

    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    console.error("Error in POST /api/athlete/phase/advance:", err);
    throw createError({
      statusCode: 500,
      statusMessage: errorMessage,
    });
  }
});
