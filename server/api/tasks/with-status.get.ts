/**
 * GET /api/tasks/with-status
 * Fetch all tasks with athlete's completion status merged
 */

import { defineEventHandler, getQuery } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import type { TaskWithStatus } from "~/types/timeline";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();

  try {
    const query = getQuery(event);
    const gradeLevel = query.gradeLevel
      ? parseInt(query.gradeLevel as string)
      : undefined;

    // Fetch all tasks
    let tasksRequest = supabase.from("task").select("*");

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
      console.error("Supabase error fetching tasks:", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch tasks",
      });
    }

    // Fetch athlete's task statuses
    const { data: athleteTasksData, error: athleteTasksError } = await supabase
      .from("athlete_task")
      .select("*")
      .eq("athlete_id", user.id);

    if (athleteTasksError) {
      console.error(
        "Supabase error fetching athlete tasks:",
        athleteTasksError,
      );
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

      return {
        ...(task as Record<string, unknown>),
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
    const message =
      err instanceof Error ? err.message : "Failed to fetch tasks with status";
    console.error("Tasks with status fetch error:", err);
    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
