import { defineEventHandler, getRouterParam, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { logCRUD, logError } from "~/server/utils/auditLog";

interface CompleteUpdateData {
  completed: boolean;
  completed_at: string;
  [key: string]: unknown;
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const suggestionId = getRouterParam(event, "id");

  if (!suggestionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Suggestion ID is required",
    });
  }

  const updateData: CompleteUpdateData = {
    completed: true,
    completed_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("suggestion")
    .update(updateData)
    .eq("id", suggestionId)
    .eq("athlete_id", user.id);

  if (error) {
    // Log failed completion
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "suggestions",
      resourceId: suggestionId,
      errorMessage: error.message,
      description: "Failed to mark suggestion as complete",
    });

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to complete suggestion",
    });
  }

  // Log successful completion
  await logCRUD(event, {
    userId: user.id,
    action: "UPDATE",
    resourceType: "suggestions",
    resourceId: suggestionId,
    newValues: updateData,
    description: "Marked suggestion as complete",
  });

  return { success: true };
});
