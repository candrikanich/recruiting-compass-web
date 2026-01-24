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

    // Helper to safely extract task_id from athlete task
    const getAthleteTaskId = (at: any): string | undefined => {
      return typeof at === "object" &&
        at !== null &&
        "task_id" in at &&
        typeof at.task_id === "string"
        ? at.task_id
        : undefined;
    };

    // Helper to safely check if athlete task is completed
    const isAthleteTaskCompleted = (at: any): boolean => {
      return (
        typeof at === "object" &&
        at !== null &&
        "status" in at &&
        at.status === "completed"
      );
    };

    // Create map for quick lookup
    const athleteTaskMap = new Map(
      (Array.isArray(athleteTasksData) ? athleteTasksData : [])
        .map((at) => {
          const taskId = getAthleteTaskId(at);
          return taskId ? [taskId, at] : null;
        })
        .filter((entry): entry is [string, any] => entry !== null),
    );

    // Merge tasks with athlete data
    const merged = (Array.isArray(tasksData) ? tasksData : []).map(
      (task: any) => {
        const athleteTask = athleteTaskMap.get(task.id);
        const dependencies = (task.dependency_task_ids || [])
          .map((depId: string) => tasksData?.find((t: any) => t.id === depId))
          .filter(Boolean);

        const allDepsComplete =
          dependencies.length === 0 ||
          dependencies.every((dep: any) => {
            const depAthleteTask = athleteTaskMap.get(dep.id);
            return depAthleteTask && isAthleteTaskCompleted(depAthleteTask);
          });

        return {
          ...task,
          athlete_task: athleteTask,
          has_incomplete_prerequisites:
            task.dependency_task_ids?.length > 0 && !allDepsComplete,
          prerequisite_tasks: dependencies,
        } as TaskWithStatus;
      },
    );

    return merged;
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

    console.error("Error in GET /api/tasks/with-status:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch tasks with status",
    });
  }
});
