import { d as defineEventHandler, b as getQuery, a as createError } from '../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../_/supabase.mjs';
import { r as requireAuth } from '../../../_/auth.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const withStatus_get = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  try {
    const query = getQuery(event);
    const gradeLevel = query.gradeLevel ? parseInt(query.gradeLevel) : void 0;
    let tasksRequest = supabase.from("task").select("*");
    if (gradeLevel) {
      tasksRequest = tasksRequest.eq("grade_level", gradeLevel);
    }
    const { data: tasksData, error: tasksError } = await tasksRequest.order("grade_level", {
      ascending: true
    });
    if (tasksError) {
      console.error("Supabase error fetching tasks:", tasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch tasks"
      });
    }
    const { data: athleteTasksData, error: athleteTasksError } = await supabase.from("athlete_task").select("*").eq("athlete_id", user.id);
    if (athleteTasksError) {
      console.error("Supabase error fetching athlete tasks:", athleteTasksError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks"
      });
    }
    const getAthleteTaskId = (at) => {
      return typeof at === "object" && at !== null && "task_id" in at && typeof at.task_id === "string" ? at.task_id : void 0;
    };
    const isAthleteTaskCompleted = (at) => {
      return typeof at === "object" && at !== null && "status" in at && at.status === "completed";
    };
    const athleteTaskMap = new Map(
      (Array.isArray(athleteTasksData) ? athleteTasksData : []).map((at) => {
        const taskId = getAthleteTaskId(at);
        return taskId ? [taskId, at] : null;
      }).filter((entry) => entry !== null)
    );
    const merged = (Array.isArray(tasksData) ? tasksData : []).map((task) => {
      var _a;
      const athleteTask = athleteTaskMap.get(task.id);
      const dependencies = (task.dependency_task_ids || []).map((depId) => tasksData == null ? void 0 : tasksData.find((t) => t.id === depId)).filter(Boolean);
      const allDepsComplete = dependencies.length === 0 || dependencies.every((dep) => {
        const depAthleteTask = athleteTaskMap.get(dep.id);
        return depAthleteTask && isAthleteTaskCompleted(depAthleteTask);
      });
      return {
        ...task,
        athlete_task: athleteTask,
        has_incomplete_prerequisites: ((_a = task.dependency_task_ids) == null ? void 0 : _a.length) > 0 && !allDepsComplete,
        prerequisite_tasks: dependencies
      };
    });
    return merged;
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
    console.error("Error in GET /api/tasks/with-status:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch tasks with status"
    });
  }
});

export { withStatus_get as default };
//# sourceMappingURL=with-status.get.mjs.map
