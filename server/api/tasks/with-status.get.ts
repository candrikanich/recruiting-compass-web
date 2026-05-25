/**
 * GET /api/tasks/with-status
 * Fetch all tasks with athlete's completion status merged
 */

import { defineEventHandler, getQuery } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { resolveTargetAthleteId } from "~/server/utils/athleteAccess";
import { computeTaskDeadline } from "~/server/utils/taskDeadlines";
import { useLogger } from "~/server/utils/logger";
import type { TaskWithStatus } from "~/types/timeline";

const TASK_COLUMNS =
  "id, category, grade_level, title, description, required, dependency_task_ids, why_it_matters, failure_risk, division_applicability, deadline_offset_months, created_at, updated_at";

const ATHLETE_TASK_COLUMNS =
  "id, athlete_id, task_id, status, completed_at, is_recovery_task, created_at, updated_at";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "tasks/with-status");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  try {
    const query = getQuery(event);
    const gradeLevel = query.gradeLevel
      ? parseInt(query.gradeLevel as string)
      : undefined;

    // Resolve target athlete (caller, or a parent's linked athlete via ?athleteId).
    const athleteId = await resolveTargetAthleteId(
      event,
      user.id,
      query.athleteId as string | undefined,
    );

    // Athlete's graduation year drives deadline computation.
    const { data: athlete } = await supabase
      .from("users")
      .select("graduation_year")
      .eq("id", athleteId)
      .maybeSingle();
    const graduationYear =
      (athlete as { graduation_year: number | null } | null)?.graduation_year ??
      null;

    // Fetch all tasks
    let tasksRequest = supabase.from("task").select(TASK_COLUMNS);

    if (gradeLevel) {
      tasksRequest = tasksRequest.eq("grade_level", gradeLevel);
    }

    const { data: tasksData, error: tasksError } = await tasksRequest.order(
      "grade_level",
      {
        ascending: true,
      },
    );

    if (tasksError) {
      logger.error("Supabase error fetching tasks", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch tasks",
      });
    }

    // Fetch athlete's task statuses
    const { data: athleteTasksData, error: athleteTasksError } = await supabase
      .from("athlete_task")
      .select(ATHLETE_TASK_COLUMNS)
      .eq("athlete_id", athleteId);

    if (athleteTasksError) {
      logger.error("Supabase error fetching athlete tasks", athleteTasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks",
      });
    }

    // Create map for quick lookup
    const athleteTaskMap = new Map<string, unknown>();
    if (Array.isArray(athleteTasksData)) {
      athleteTasksData.forEach((at) => {
        if (
          at &&
          typeof at === "object" &&
          "task_id" in at &&
          typeof at.task_id === "string"
        ) {
          athleteTaskMap.set(at.task_id, at);
        }
      });
    }

    // Merge tasks with athlete data
    const merged = (Array.isArray(tasksData) ? tasksData : []).map((task) => {
      const athleteTask = athleteTaskMap.get((task as { id: string }).id);
      const dependencies = (
        (task as { dependency_task_ids?: string[] }).dependency_task_ids || []
      )
        .map((depId: string) =>
          (tasksData as Array<{ id: string }>)?.find(
            (t: { id: string }) => t.id === depId,
          ),
        )
        .filter((dep: { id: string } | undefined): dep is { id: string } =>
          Boolean(dep),
        );

      const allDepsComplete =
        dependencies.length === 0 ||
        dependencies.every((dep: { id: string }) => {
          const depAthleteTask = athleteTaskMap.get(dep.id);
          return (
            depAthleteTask &&
            typeof depAthleteTask === "object" &&
            depAthleteTask !== null &&
            "status" in depAthleteTask &&
            depAthleteTask.status === "completed"
          );
        });

      const { deadline_offset_months, ...taskRest } = task as Record<
        string,
        unknown
      > & { deadline_offset_months?: number | null };

      return {
        ...taskRest,
        deadline_date: computeTaskDeadline(
          graduationYear,
          deadline_offset_months ?? null,
        ),
        athlete_task: athleteTask,
        has_incomplete_prerequisites:
          ((task as { dependency_task_ids?: string[] }).dependency_task_ids
            ?.length || 0) > 0 && !allDepsComplete,
        prerequisite_tasks: dependencies,
      } as TaskWithStatus;
    });

    return {
      success: true,
      data: merged,
    };
  } catch (err: unknown) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Tasks with status fetch error", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch tasks with status",
    });
  }
});
