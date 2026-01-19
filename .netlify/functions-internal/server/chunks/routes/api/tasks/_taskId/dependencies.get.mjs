import { d as defineEventHandler, a as createError } from '../../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../../_/supabase.mjs';
import { r as requireAuth } from '../../../../_/auth.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

function getDependencyTaskIds(task) {
  return typeof task === "object" && task !== null && Array.isArray(task.dependency_task_ids) ? task.dependency_task_ids : [];
}
function isAthleteTaskCompleted(at) {
  return typeof at === "object" && at !== null && at.status === "completed";
}
const dependencies_get = defineEventHandler(async (event) => {
  var _a;
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const taskId = (_a = event.context.params) == null ? void 0 : _a.taskId;
  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Task ID is required"
    });
  }
  try {
    const { data: taskData, error: taskError } = await supabase.from("task").select("*").eq("id", taskId).single();
    if (taskError) {
      console.error("Supabase error fetching task:", taskError);
      throw createError({
        statusCode: 404,
        statusMessage: "Task not found"
      });
    }
    const dependencyIds = getDependencyTaskIds(taskData);
    if (dependencyIds.length === 0) {
      return {
        complete: true,
        prerequisites: [],
        incompletePrerequisites: []
      };
    }
    const { data: prerequisitesData, error: prerequisitesError } = await supabase.from("task").select("*").in("id", dependencyIds);
    if (prerequisitesError) {
      console.error("Supabase error fetching prerequisites:", prerequisitesError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch task dependencies"
      });
    }
    const { data: athleteTasksData, error: athleteTasksError } = await supabase.from("athlete_task").select("*").eq("athlete_id", user.id).in("task_id", dependencyIds);
    if (athleteTasksError) {
      console.error("Supabase error fetching athlete tasks:", athleteTasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch task completion status"
      });
    }
    const athleteTaskMap = new Map(
      (Array.isArray(athleteTasksData) ? athleteTasksData : []).map((at) => typeof at === "object" && at !== null && "task_id" in at ? [at.task_id, at] : null).filter((entry) => entry !== null)
    );
    const completePrerequisites = (Array.isArray(prerequisitesData) ? prerequisitesData : []).filter(
      (task) => {
        const athleteTask = athleteTaskMap.get(task.id);
        return athleteTask && isAthleteTaskCompleted(athleteTask);
      }
    );
    const incompletePrerequisites = (Array.isArray(prerequisitesData) ? prerequisitesData : []).filter(
      (task) => {
        const athleteTask = athleteTaskMap.get(task.id);
        return !athleteTask || !isAthleteTaskCompleted(athleteTask);
      }
    );
    return {
      complete: incompletePrerequisites.length === 0,
      prerequisites: Array.isArray(prerequisitesData) ? prerequisitesData : [],
      incompletePrerequisites
    };
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized"
      });
    }
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    console.error("Error in GET /api/tasks/[taskId]/dependencies:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch task dependencies"
    });
  }
});

export { dependencies_get as default };
//# sourceMappingURL=dependencies.get.mjs.map
