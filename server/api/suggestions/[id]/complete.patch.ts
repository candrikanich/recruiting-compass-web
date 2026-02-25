import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { logCRUD, logError } from "~/server/utils/auditLog";
import { requireUuidParam } from "~/server/utils/validation";

interface CompleteUpdateData {
  completed: boolean;
  completed_at: string;
  [key: string]: unknown;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "suggestions/complete");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const suggestionId = requireUuidParam(event, "id");

  try {
    const updateData: CompleteUpdateData = {
      completed: true,
      completed_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from("suggestion")
      .update(updateData)
      .eq("id", suggestionId)
      .eq("athlete_id", user.id)
      .select("id");

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

    if (!updated || updated.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: "Suggestion not found or not authorized",
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
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) throw error;
    logger.error("Failed to complete suggestion", error);
    throw createError({ statusCode: 500, statusMessage: "Failed to complete suggestion" });
  }
});
