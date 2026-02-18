import { defineEventHandler, getRouterParam, createError, readBody } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

/**
 * Cascade delete a school and all related records
 * POST /api/schools/[id]/cascade-delete
 *
 * This endpoint safely deletes a school by:
 * 1. Deleting all related records (coaches, interactions, offers, etc.)
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
  const schoolId = getRouterParam(event, "id");

  if (!schoolId) {
    throw createError({
      statusCode: 400,
      statusMessage: "School ID is required",
    });
  }

  let body = {};
  try {
    body = await readBody(event);
  } catch {
    // Empty body is OK
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { confirmDelete } = body as any;
  if (!confirmDelete) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Must set "confirmDelete": true in request body to proceed',
    });
  }

  const client = createServerSupabaseClient();
  const deleted: Record<string, number> = {};

  try {
    // Delete in dependency order (careful of cascade constraints)

    // 1. Delete audit logs
    const { count: historyCount } = await client
      .from("school_status_history")
      .delete()
      .eq("school_id", schoolId);
    if (historyCount) deleted.school_status_history = historyCount;

    // 2. Delete coaches (has FK constraint)
    const { count: coachCount } = await client
      .from("coaches")
      .delete()
      .eq("school_id", schoolId);
    if (coachCount) deleted.coaches = coachCount;

    // 3. Delete interactions (has FK constraint)
    const { count: interactionCount } = await client
      .from("interactions")
      .delete()
      .eq("school_id", schoolId);
    if (interactionCount) deleted.interactions = interactionCount;

    // 4. Delete offers (has FK constraint)
    const { count: offerCount } = await client
      .from("offers")
      .delete()
      .eq("school_id", schoolId);
    if (offerCount) deleted.offers = offerCount;

    // 5. Delete social media posts (has FK constraint)
    const { count: postCount } = await client
      .from("social_media_posts")
      .delete()
      .eq("school_id", schoolId);
    if (postCount) deleted.social_media_posts = postCount;

    // 6. Delete documents (optional FK)
    const { count: docCount } = await client
      .from("documents")
      .delete()
      .eq("school_id", schoolId);
    if (docCount) deleted.documents = docCount;

    // 7. Delete events (optional FK)
    const { count: eventCount } = await client
      .from("events")
      .delete()
      .eq("school_id", schoolId);
    if (eventCount) deleted.events = eventCount;

    // 8. Delete suggestions (optional FK)
    const { count: suggestionCount } = await client
      .from("suggestion")
      .delete()
      .eq("related_school_id", schoolId);
    if (suggestionCount) deleted.suggestion = suggestionCount;

    // 9. Finally delete the school
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
