/**
 * GET /api/tasks/[taskId]/dependencies
 * Fetch task dependencies and completion status
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import type { Task } from "~/types/timeline";

interface DependenciesResponse {
  complete: boolean;
  prerequisites: Task[];
  incompletePrerequisites: Task[];
}

// Helper to safely get dependency task IDs
function getDependencyTaskIds(task: unknown): string[] {
  const taskRecord = task as Record<string, unknown>;
  return typeof task === "object" &&
    task !== null &&
    Array.isArray(taskRecord.dependency_task_ids)
    ? (taskRecord.dependency_task_ids as string[])
    : [];
}

// Helper to check if athlete task is completed
function isAthleteTaskCompleted(at: unknown): boolean {
  const atRecord = at as Record<string, unknown>;
  return (
    typeof at === "object" && at !== null && atRecord.status === "completed"
  );
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const taskId = event.context.params?.taskId as string;

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Task ID is required",
    });
  }

  try {
    // Fetch the task to get its dependencies
    const { data: taskData, error: taskError } = await supabase
      .from("task")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError) {
      console.error("Supabase error fetching task:", taskError);
      throw createError({
        statusCode: 404,
        statusMessage: "Task not found",
      });
    }

    const dependencyIds = getDependencyTaskIds(taskData);
    if (dependencyIds.length === 0) {
      return {
        complete: true,
        prerequisites: [],
        incompletePrerequisites: [],
      } as DependenciesResponse;
    }

    // Fetch prerequisite tasks
    const { data: prerequisitesData, error: prerequisitesError } =
      await supabase.from("task").select("*").in("id", dependencyIds);

    if (prerequisitesError) {
      console.error(
        "Supabase error fetching prerequisites:",
        prerequisitesError,
      );
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch task dependencies",
      });
    }

    // Fetch athlete's completion status for prerequisites
    const { data: athleteTasksData, error: athleteTasksError } = await supabase
      .from("athlete_task")
      .select("*")
      .eq("athlete_id", user.id)
      .in("task_id", dependencyIds);

    if (athleteTasksError) {
      console.error(
        "Supabase error fetching athlete tasks:",
        athleteTasksError,
      );
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch task completion status",
      });
    }

    // Create map for quick lookup
    const validTasks = (Array.isArray(athleteTasksData) ? athleteTasksData : [])
      .map((at: unknown) => {
        const atRecord = at as Record<string, unknown>;
        return typeof at === "object" && at !== null && "task_id" in atRecord
          ? [atRecord.task_id as string, atRecord]
          : null;
      })
      .filter(
        (entry): entry is [string, Record<string, unknown>] => entry !== null,
      ) as [string, Record<string, unknown>][];

    const athleteTaskMap = new Map(validTasks);

    // Separate complete and incomplete prerequisites
    const completePrerequisites = (
      Array.isArray(prerequisitesData) ? prerequisitesData : []
    ).filter((task: any) => {
      const athleteTask = athleteTaskMap.get(task.id);
      return athleteTask && isAthleteTaskCompleted(athleteTask);
    });

    const incompletePrerequisites = (
      Array.isArray(prerequisitesData) ? prerequisitesData : []
    ).filter((task: unknown) => {
      const taskRecord = task as Record<string, unknown>;
      const athleteTask = athleteTaskMap.get(taskRecord.id as string);
      return !athleteTask || !isAthleteTaskCompleted(athleteTask);
    });

    return {
      complete: incompletePrerequisites.length === 0,
      prerequisites: Array.isArray(prerequisitesData) ? prerequisitesData : [],
      incompletePrerequisites,
    } as DependenciesResponse;
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

    console.error("Error in GET /api/tasks/[taskId]/dependencies:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch task dependencies",
    });
  }
});
