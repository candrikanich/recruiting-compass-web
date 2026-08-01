/**
 * POST /api/athlete/phase/advance
 * Attempt to advance athlete to next phase
 * RESTRICTED: Athletes only (parents have read-only access)
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { logCRUD, logError } from "~/server/utils/auditLog";
import type { Phase } from "~/types/timeline";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import {
  canAdvancePhase,
  getNextPhase,
  buildPhaseMilestoneData,
} from "~/utils/phaseCalculation";
import {
  computePhaseFromGraduationYear,
  getTaskIdsBySlug,
} from "~/server/utils/athletePhase";

interface AdvancePhaseResponse {
  success: boolean;
  phase: Phase;
  message: string;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "athlete/phase/advance");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  // Ensure requesting user is not a parent (mutation restricted)
  await assertNotParent(user.id, supabase);

  try {
    // Get current phase — always operates on the requesting user's own record,
    // so there is no separate "athleteId" param that could target someone else's phase.
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("current_phase")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      logger.error("Error fetching user phase", userError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch user phase",
      });
    }

    // Row gone (account deleted mid-session): advancing would no-op the later
    // UPDATE and report success — fail honestly instead, without a 500 alert
    if (!userData) {
      logger.warn("User row missing for phase advance", { userId: user.id });
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
      });
    }

    const storedPhase = (userData?.current_phase ?? null) as Phase | null;

    let currentPhase: Phase;

    if (storedPhase) {
      currentPhase = storedPhase;
    } else {
      // Never explicitly advanced — fall back to the same grade-derived default
      // GET /api/athlete/phase uses, so advance semantics stay consistent with
      // what the athlete currently sees.
      const { data: prefData, error: prefError } = await supabase
        .from("user_preferences")
        .select("data")
        .eq("user_id", user.id)
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

    // Fetch completed tasks
    const { data: athleteTasksData, error: tasksError } = await supabase
      .from("athlete_task")
      .select("task_id")
      .eq("athlete_id", user.id)
      .eq("status", "completed");

    if (tasksError) {
      logger.error("Error fetching athlete tasks", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks",
      });
    }

    const completedTaskIds = (athleteTasksData || []).map(
      (at: { task_id: string }) => at.task_id,
    );

    // Resolve PHASE_MILESTONES slugs to real seeded task ids
    const taskIdsBySlug = await getTaskIdsBySlug(supabase);

    // Get next phase first: an athlete already at "committed" (the final phase)
    // gets a clear idempotent response rather than a confusing gating failure.
    const nextPhase = getNextPhase(currentPhase);

    if (!nextPhase) {
      return {
        success: false,
        phase: currentPhase,
        message: "Already at final phase",
      } as AdvancePhaseResponse;
    }

    // Check if can advance
    if (!canAdvancePhase(currentPhase, completedTaskIds, taskIdsBySlug)) {
      return {
        success: false,
        phase: currentPhase,
        message: "Cannot advance phase - not all milestones completed",
      } as AdvancePhaseResponse;
    }

    // Update user's phase
    const phaseMilestoneData = buildPhaseMilestoneData(
      nextPhase,
      completedTaskIds,
      taskIdsBySlug,
    );

    // phase_milestone_data is a custom JSONB column not captured in generated types
    const updateResult = await supabase
      .from("users")
      .update({
        current_phase: nextPhase,
        phase_milestone_data: phaseMilestoneData,
        updated_at: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .eq("id", user.id);

    const { error: updateError } = updateResult;

    if (updateError) {
      logger.error("Error updating user phase", updateError);
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
    // Re-throw H3 errors immediately — they were already logged at their source
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    const errorMessage =
      err instanceof Error ? err.message : "Failed to advance phase";

    // Only log truly unexpected errors
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "users",
      resourceId: user.id,
      errorMessage,
      description: "Unexpected error advancing phase",
    });

    logger.error("Unexpected error in POST /api/athlete/phase/advance", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to advance phase",
    });
  }
});
