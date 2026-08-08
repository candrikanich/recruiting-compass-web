import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { resolveAthleteId } from "~/server/utils/resolveAthleteId";
import { useLogger } from "~/server/utils/logger";
import { logCRUD, logError } from "~/server/utils/auditLog";
import { requireUuidParam } from "~/server/utils/validation";

interface DismissUpdateData {
  dismissed: boolean;
  dismissed_at: string;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "suggestions/dismiss");
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const suggestionId = requireUuidParam(event, "id");

  try {
    // Parents act on their linked player's suggestions; resolve so the update
    // scopes to the athlete's rows rather than the (non-matching) parent id.
    const athleteId = await resolveAthleteId(user.id, supabase);

    const updateData: DismissUpdateData = {
      dismissed: true,
      dismissed_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("suggestion")
      .update(updateData)
      .eq("id", suggestionId)
      .eq("athlete_id", athleteId);

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
      newValues: updateData as unknown as Record<string, unknown>,
      description: "Dismissed suggestion",
    });

    logger.info("Suggestion dismissed", { suggestionId, userId: user.id });
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) throw error;
    logger.error("Failed to dismiss suggestion", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to dismiss suggestion",
    });
  }
});
