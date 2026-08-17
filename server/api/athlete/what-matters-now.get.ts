/**
 * GET /api/athlete/what-matters-now
 * Returns the athlete's prioritized "what matters now" tasks for the current
 * phase — the single source of truth for the dashboard timeline's current-task.
 *
 * Shared by web (DashboardTimelineCard.vue) and iOS so both render the SAME
 * top-priority task instead of re-deriving it independently. Selection logic
 * lives in the pure `getWhatMattersNow` util; this endpoint only resolves the
 * athlete, derives the phase, and feeds it that athlete's tasks-with-status.
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { resolveViewerAthleteId } from "~/server/utils/athleteAccess";
import { computePhaseFromGraduationYear } from "~/server/utils/athletePhase";
import { useLogger } from "~/server/utils/logger";
import {
  getWhatMattersNow,
  type WhatMattersItem,
} from "~/utils/whatMattersNow";
import type { Phase, TaskWithStatus } from "~/types/timeline";

// Grade level for each phase — mirrors the mapping inside getWhatMattersNow so
// we fetch only the relevant grade's tasks (avoids the /api/tasks 100-row cap).
const PHASE_GRADES: Record<Phase, number> = {
  freshman: 9,
  sophomore: 10,
  junior: 11,
  senior: 12,
  committed: 12,
};

export default defineEventHandler(async (event): Promise<WhatMattersItem[]> => {
  const logger = useLogger(event, "athlete/what-matters-now");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  try {
    const athleteId = await resolveViewerAthleteId(supabase, user.id);

    // Derive phase: users.current_phase (source of truth once advanced) else
    // grade-derived from graduation_year — identical to GET /api/athlete/phase.
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("current_phase")
      .eq("id", athleteId)
      .maybeSingle();

    if (userError) {
      logger.error("Error fetching user phase", userError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch user phase",
      });
    }

    let phase = (userData?.current_phase ?? null) as Phase | null;

    if (!phase) {
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
      phase = computePhaseFromGraduationYear(graduationYear);
    }

    const currentGrade = PHASE_GRADES[phase];

    // Fetch the current grade's task catalog and the athlete's completion state,
    // then merge into the shape getWhatMattersNow expects.
    const [tasksResult, athleteTasksResult] = await Promise.all([
      supabase
        .from("task")
        .select(
          "id, category, grade_level, title, required, dependency_task_ids, why_it_matters",
        )
        .eq("grade_level", currentGrade),
      supabase
        .from("athlete_task")
        .select("task_id, status")
        .eq("athlete_id", athleteId),
    ]);

    if (tasksResult.error) {
      logger.error("Error fetching tasks", tasksResult.error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch tasks",
      });
    }
    if (athleteTasksResult.error) {
      logger.error("Error fetching athlete tasks", athleteTasksResult.error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks",
      });
    }

    const statusByTaskId = new Map(
      (athleteTasksResult.data ?? []).map((at) => [at.task_id, at.status]),
    );

    const tasksWithStatus = (tasksResult.data ?? []).map((task) => {
      const status = statusByTaskId.get(task.id);
      return {
        ...task,
        athlete_task: status ? { status } : undefined,
      } as unknown as TaskWithStatus;
    });

    return getWhatMattersNow({ phase, tasksWithStatus });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    logger.error("Error in GET /api/athlete/what-matters-now", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch what matters now",
    });
  }
});
