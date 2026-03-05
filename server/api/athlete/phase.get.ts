/**
 * GET /api/athlete/phase
 * Fetch athlete's current phase and milestone progress
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth, getUserRole } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import type { AthleteAPI } from "~/types/api/athlete";
import type { Phase } from "~/types/timeline";
import {
  getMilestoneProgress,
  canAdvancePhase,
} from "~/utils/phaseCalculation";
import { calculateCurrentGrade } from "~/utils/gradeHelpers";

/**
 * Map grade level (9-12) to phase
 */
function gradeToPhase(grade: number): Phase {
  if (grade === 9) return "freshman";
  if (grade === 10) return "sophomore";
  if (grade === 11) return "junior";
  if (grade === 12) return "senior";
  // Default to freshman if grade is out of range
  return "freshman";
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "athlete/phase");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  try {
    // Resolve the athlete ID: parents view their linked player's data
    let athleteId = user.id;
    const role = await getUserRole(user.id, supabase);
    if (role === "parent") {
      const { data: familyMembership } = await supabase
        .from("family_members")
        .select("family_unit_id")
        .eq("user_id", user.id)
        .eq("role", "parent")
        .maybeSingle();

      if (familyMembership) {
        const { data: playerMember } = await supabase
          .from("family_members")
          .select("user_id")
          .eq("family_unit_id", familyMembership.family_unit_id)
          .eq("role", "player")
          .maybeSingle();

        if (playerMember?.user_id) {
          athleteId = playerMember.user_id;
          logger.info("Parent viewing linked player's phase", {
            parentId: user.id,
            athleteId,
          });
        }
      }
    }

    // Fetch graduation year from user_preferences (player category)
    const { data: prefData, error: prefError } = await supabase
      .from("user_preferences")
      .select("data")
      .eq("user_id", athleteId)
      .eq("category", "player")
      .single();

    if (prefError && prefError.code !== "PGRST116") {
      // PGRST116 = no rows found, which is OK (player prefs not set yet)
      logger.error("Error fetching player preferences", prefError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch player preferences",
      });
    }

    // Fetch athlete's completed tasks
    const { data: athleteTasksData, error: tasksError } = await supabase
      .from("athlete_task")
      .select("task_id, status")
      .eq("athlete_id", athleteId)
      .eq("status", "completed");

    if (tasksError) {
      logger.error("Error fetching athlete tasks", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks",
      });
    }

    const completedTaskIds = athleteTasksData
      ?.map((at: { task_id: string }) => at.task_id)
      .filter(Boolean) as string[];

    // Calculate current phase based on graduation year from player preferences
    const playerData = prefData?.data as Record<string, unknown> | null;
    const graduationYear =
      typeof playerData?.graduation_year === "number"
        ? playerData.graduation_year
        : null;

    let currentPhase: Phase;

    if (graduationYear) {
      const currentGrade = calculateCurrentGrade(graduationYear);
      currentPhase = gradeToPhase(currentGrade);
    } else {
      currentPhase = "freshman";
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

    logger.error("Error in GET /api/athlete/phase", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch phase",
    });
  }
});
