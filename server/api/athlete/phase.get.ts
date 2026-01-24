/**
 * GET /api/athlete/phase
 * Fetch athlete's current phase and milestone progress
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import type { AthleteAPI } from "~/types/api/athlete";
import type { Phase } from "~/types/timeline";
import {
  calculatePhase,
  getMilestoneProgress,
  canAdvancePhase,
} from "~/utils/phaseCalculation";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  try {
    // Fetch user to get current phase
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

    // Fetch athlete's completed tasks
    const { data: athleteTasksData, error: tasksError } = await supabase
      .from("athlete_task")
      .select("task_id, status")
      .eq("athlete_id", user.id)
      .eq("status", "completed");

    if (tasksError) {
      console.error("Error fetching athlete tasks:", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks",
      });
    }

    const completedTaskIds = athleteTasksData
      ?.map((at: any) => at.task_id)
      .filter(Boolean) as string[];

    // Calculate current phase if not already set
    const currentPhaseValue = (userData as any)?.current_phase;
    let currentPhase: Phase = (
      typeof currentPhaseValue === "string" ? currentPhaseValue : "freshman"
    ) as Phase;
    const calculatedPhase = calculatePhase(completedTaskIds, false);

    // Use calculated phase if it's more advanced than stored phase
    if (calculatedPhase > currentPhase) {
      currentPhase = calculatedPhase;
    }

    // Get milestone progress for current phase
    const progress = getMilestoneProgress(currentPhase, completedTaskIds);

    // Check if can advance
    const canAdvance = canAdvancePhase(currentPhase, completedTaskIds);

    const response: AthleteAPI.GetPhaseResponse = {
      phase: currentPhase,
      milestoneProgress: progress,
      canAdvance,
    };

    return response satisfies AthleteAPI.GetPhaseResponse;
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    console.error("Error in GET /api/athlete/phase:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch phase",
    });
  }
});
