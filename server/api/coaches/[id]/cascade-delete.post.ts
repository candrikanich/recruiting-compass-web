import { defineEventHandler, createError } from "h3";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { extractRequestToken } from "~/server/utils/requestToken";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";
import { requireConfirmDelete } from "~/server/utils/entityDeletion";

/**
 * Cascade delete a coach and all related records
 * POST /api/coaches/[id]/cascade-delete
 *
 * This endpoint safely deletes a coach by:
 * 1. Deleting all related records (interactions, offers)
 * 2. Finally deleting the coach itself
 *
 * Body (optional):
 * {
 *   "confirmDelete": true  // Must be true to proceed
 * }
 *
 * Returns:
 * - success: boolean
 * - deleted: object with counts of deleted records by table
 * - coachId: the deleted coach ID
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "coaches/cascade-delete");

  // Auth first, then validate inputs
  await requireAuth(event);
  const coachId = requireUuidParam(event, "id");

  await requireConfirmDelete(event);

  // Use authenticated client to respect RLS policies
  const token = extractRequestToken(event);
  const client = createServerSupabaseUserClient(token);
  const deleted: Record<string, number> = {};

  try {
    // Delete in dependency order (careful of FK constraints)

    // 1. Delete follow-up reminders
    const { count: reminderCount, error: reminderError } = await client
      .from("follow_up_reminders")
      .delete()
      .eq("coach_id", coachId);
    if (reminderError) throw reminderError;
    if (reminderCount) deleted.follow_up_reminders = reminderCount;

    // 2. Delete interactions
    const { count: interactionCount, error: interactionError } = await client
      .from("interactions")
      .delete()
      .eq("coach_id", coachId);
    if (interactionError) throw interactionError;
    if (interactionCount) deleted.interactions = interactionCount;

    // 3. Delete offers
    const { count: offerCount, error: offerError } = await client
      .from("offers")
      .delete()
      .eq("coach_id", coachId);
    if (offerError) throw offerError;
    if (offerCount) deleted.offers = offerCount;

    // 4. Finally delete the coach
    const { count: coachCount, error: deleteError } = await client
      .from("coaches")
      .delete()
      .eq("id", coachId);

    if (deleteError) throw deleteError;

    if (coachCount && coachCount > 0) {
      deleted.coaches = coachCount;
    }

    // Success even if coach was already deleted - we still cleaned up the related records
    const totalDeleted = Object.values(deleted).reduce(
      (a: number, b: number) => a + b,
      0,
    );
    return {
      success: true,
      coachId,
      deleted,
      message:
        totalDeleted > 0
          ? `Successfully deleted ${totalDeleted} related records${coachCount ? " and the coach itself" : ""}`
          : "No records to delete",
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to cascade delete coach", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to cascade delete coach",
    });
  }
});
