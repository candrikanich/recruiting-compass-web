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
import {
  computePhaseFromGraduationYear,
  getTaskIdsBySlug,
} from "~/server/utils/athletePhase";

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

    // users.current_phase is the source of truth once an athlete has explicitly
    // advanced (via POST /api/athlete/phase/advance). NULL means "never advanced" —
    // fall back to a grade-derived phase below.
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("current_phase")
      .eq("id", athleteId)
      .single();

    if (userError) {
      logger.error("Error fetching user phase", userError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch user phase",
      });
    }

    const storedPhase = (userData?.current_phase ?? null) as Phase | null;

    let currentPhase: Phase;

    if (storedPhase) {
      currentPhase = storedPhase;
    } else {
      // Fetch graduation year from user_preferences (player category).
      // maybeSingle() returns { data: null, error: null } when 0 rows exist —
      // no need to special-case PGRST116. Only real errors (connection failures,
      // RLS violations, duplicate rows) surface as prefError.
      const { data: prefData, error: prefError } = await supabase
        .from("user_preferences")
        .select("data")
        .eq("user_id", athleteId)
        .eq("category", "player")
        .maybeSingle();

      if (prefError) {
        logger.error("Error fetching player preferences", prefError);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to fetch player preferences",
        });
      }

      const playerData = prefData?.data as Record<string, unknown> | null;
      const graduationYear =
        typeof playerData?.graduation_year === "number"
          ? playerData.graduation_year
          : null;

      currentPhase = computePhaseFromGraduationYear(graduationYear);
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

    // Resolve PHASE_MILESTONES slugs to real seeded task ids
    const taskIdsBySlug = await getTaskIdsBySlug(supabase);

    // Get milestone progress for current phase
    const progress = getMilestoneProgress(
      currentPhase,
      completedTaskIds,
      taskIdsBySlug,
    );

    // Check if can advance
    const canAdvance = canAdvancePhase(
      currentPhase,
      completedTaskIds,
      taskIdsBySlug,
    );

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
