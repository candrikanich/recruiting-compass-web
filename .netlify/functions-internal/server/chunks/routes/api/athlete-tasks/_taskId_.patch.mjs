import { d as defineEventHandler, a as createError, r as readBody } from '../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../_/supabase.mjs';
import { r as requireAuth } from '../../../_/auth.mjs';
import { l as logError, a as logCRUD } from '../../../_/auditLog.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const _taskId__patch = defineEventHandler(async (event) => {
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
    const body = await readBody(event);
    if (!body.status) {
      throw createError({
        statusCode: 400,
        statusMessage: "Status is required"
      });
    }
    const validStatuses = ["not_started", "in_progress", "completed", "skipped"];
    if (!validStatuses.includes(body.status)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid status value"
      });
    }
    const updateData = {
      athlete_id: user.id,
      task_id: taskId,
      status: body.status,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (body.status === "completed") {
      updateData.completed_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    const { data: existingData, error: selectError } = await supabase.from("athlete_task").select("id").eq("athlete_id", user.id).eq("task_id", taskId).single();
    if (selectError && selectError.code !== "PGRST116") {
      console.error("Error checking existing athlete task:", selectError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update task status"
      });
    }
    let result;
    let action = "UPDATE";
    if (existingData) {
      const { data, error } = await supabase.from("athlete_task").update(updateData).eq("id", existingData.id).eq("athlete_id", user.id).select().single();
      if (error) {
        await logError(event, {
          userId: user.id,
          action: "UPDATE",
          resourceType: "athlete_tasks",
          resourceId: taskId,
          errorMessage: error.message,
          description: "Failed to update task status"
        });
        console.error("Supabase error updating athlete task:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to update task status"
        });
      }
      result = data;
      action = "UPDATE";
    } else {
      const { data, error } = await supabase.from("athlete_task").insert({
        athlete_id: user.id,
        task_id: taskId,
        status: updateData.status,
        updated_at: updateData.updated_at,
        completed_at: updateData.completed_at
      }).select().single();
      if (error) {
        await logError(event, {
          userId: user.id,
          action: "CREATE",
          resourceType: "athlete_tasks",
          resourceId: taskId,
          errorMessage: error.message,
          description: "Failed to create task status"
        });
        console.error("Supabase error creating athlete task:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to create task status"
        });
      }
      result = data;
      action = "CREATE";
    }
    await logCRUD(event, {
      userId: user.id,
      action,
      resourceType: "athlete_tasks",
      resourceId: taskId,
      newValues: updateData,
      description: `${action === "CREATE" ? "Created" : "Updated"} task status to ${body.status}`
    });
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "athlete_tasks",
      resourceId: taskId,
      errorMessage,
      description: "Unexpected error updating task status"
    });
    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized"
      });
    }
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    console.error("Error in PATCH /api/athlete-tasks/[taskId]:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update task status"
    });
  }
});

export { _taskId__patch as default };
//# sourceMappingURL=_taskId_.patch.mjs.map
