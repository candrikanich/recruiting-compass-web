import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { logCRUD, logError } from "~/server/utils/auditLog";
import { requireUuidParam } from "~/server/utils/validation";

interface DismissUpdateData {
  dismissed: boolean;
  dismissed_at: string;
  [key: string]: unknown;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "suggestions/dismiss");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const suggestionId = requireUuidParam(event, "id");

  try {
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
      // Log failed dismissal
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

    // Log successful dismissal
    await logCRUD(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "suggestions",
      resourceId: suggestionId,
      newValues: updateData,
      description: "Dismissed suggestion",
    });

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) throw error;
    logger.error("Failed to dismiss suggestion", error);
    throw createError({ statusCode: 500, statusMessage: "Failed to dismiss suggestion" });
  }
});
