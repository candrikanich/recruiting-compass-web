import { defineEventHandler, getRouterParam, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { logCRUD, logError } from "~/server/utils/auditLog";
import { useLogger } from "~/server/utils/logger";

interface DismissUpdateData {
  dismissed: boolean;
  dismissed_at: string;
  [key: string]: unknown;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "suggestions/dismiss");
  try {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();
    const suggestionId = getRouterParam(event, "id");

    if (!suggestionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Suggestion ID is required",
      });
    }

    const updateData: DismissUpdateData = {
      dismissed: true,
      dismissed_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("suggestion")
      .update(updateData)
      .eq("id", suggestionId)
      .eq("athlete_id", user.id);

    if (error) {
      await logError(event, {
        userId: user.id,
        action: "UPDATE",
        resourceType: "suggestions",
        resourceId: suggestionId,
        errorMessage: error.message,
        description: "Failed to dismiss suggestion",
      });

      throw createError({
        statusCode: 500,
        statusMessage: "Failed to dismiss suggestion",
      });
    }

    await logCRUD(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "suggestions",
      resourceId: suggestionId,
      newValues: updateData,
      description: "Dismissed suggestion",
    });

    logger.info("Suggestion dismissed", { suggestionId });

    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to dismiss suggestion", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to dismiss suggestion",
    });
  }
});
