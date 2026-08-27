import { defineEventHandler, createError } from "h3";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { extractRequestToken } from "~/server/utils/requestToken";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";
import { requireConfirmDelete } from "~/server/utils/entityDeletion";

/**
 * Cascade delete a school and all related records
 * POST /api/schools/[id]/cascade-delete
 *
 * This endpoint safely deletes a school by:
 * 1. Deleting all related records (coaches, interactions, offers, etc.) in parallel
 * 2. Finally deleting the school itself
 *
 * Body (optional):
 * {
 *   "confirmDelete": true  // Must be true to proceed
 * }
 *
 * Returns:
 * - success: boolean
 * - deleted: object with counts of deleted records by table
 * - schoolId: the deleted school ID
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "schools/cascade-delete");

  // Auth first, then validate inputs
  await requireAuth(event);
  const schoolId = requireUuidParam(event, "id");

  await requireConfirmDelete(event);

  // Use authenticated client to respect RLS policies
  const token = extractRequestToken(event);
  const client = createServerSupabaseUserClient(token);
  const deleted: Record<string, number> = {};

  try {
    // Delete all child records in parallel — none of these tables have FK
    // dependencies on each other, only on the parent school row.
    const [
      { count: historyCount, error: historyError },
      { count: coachCount, error: coachError },
      { count: interactionCount, error: interactionError },
      { count: offerCount, error: offerError },
      { count: docCount, error: docError },
      { count: eventCount, error: eventError },
      { count: suggestionCount, error: suggestionError },
      { count: reminderCount, error: reminderError },
    ] = await Promise.all([
      client.from("school_status_history").delete().eq("school_id", schoolId),
      client.from("coaches").delete().eq("school_id", schoolId),
      client.from("interactions").delete().eq("school_id", schoolId),
      client.from("offers").delete().eq("school_id", schoolId),
      client.from("documents").delete().eq("school_id", schoolId),
      client.from("events").delete().eq("school_id", schoolId),
      client.from("suggestion").delete().eq("related_school_id", schoolId),
      client.from("follow_up_reminders").delete().eq("school_id", schoolId),
    ]);

    const childErrors = [
      historyError,
      coachError,
      interactionError,
      offerError,
      docError,
      eventError,
      suggestionError,
      reminderError,
    ].filter(Boolean);
    if (childErrors.length > 0) {
      logger.error("Child record deletion failed during cascade delete", {
        schoolId,
        errors: childErrors,
      });
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete all related records",
      });
    }

    if (historyCount) deleted.school_status_history = historyCount;
    if (coachCount) deleted.coaches = coachCount;
    if (interactionCount) deleted.interactions = interactionCount;
    if (offerCount) deleted.offers = offerCount;
    if (docCount) deleted.documents = docCount;
    if (eventCount) deleted.events = eventCount;
    if (suggestionCount) deleted.suggestion = suggestionCount;
    if (reminderCount) deleted.follow_up_reminders = reminderCount;

    // Finally delete the school — must come after all children are removed
    const { count: schoolCount, error: deleteError } = await client
      .from("schools")
      .delete()
      .eq("id", schoolId);

    if (deleteError) throw deleteError;

    if (schoolCount && schoolCount > 0) {
      deleted.schools = schoolCount;
    }

    // Success even if school was already deleted - we still cleaned up the related records
    const totalDeleted = Object.values(deleted).reduce(
      (a: number, b: number) => a + b,
      0,
    );
    logger.info("School cascade deleted", { schoolId, totalDeleted, deleted });
    return {
      success: true,
      schoolId,
      deleted,
      message:
        totalDeleted > 0
          ? `Successfully deleted ${totalDeleted} related records${schoolCount ? " and the school itself" : ""}`
          : "No records to delete",
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Error cascade deleting school", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to cascade delete school",
    });
  }
});
