import { defineEventHandler, getRouterParam, createError, readBody } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";

/**
 * Cascade delete a coach and all related records
 * POST /api/coaches/[id]/cascade-delete
 *
 * This endpoint safely deletes a coach by:
 * 1. Deleting all related records (interactions, offers, social_media_posts)
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
  const coachId = getRouterParam(event, "id");

  if (!coachId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Coach ID is required",
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
    // Delete in dependency order (careful of FK constraints)

    // 1. Delete interactions
    const { count: interactionCount } = await client
      .from("interactions")
      .delete()
      .eq("coach_id", coachId);
    if (interactionCount) deleted.interactions = interactionCount;

    // 2. Delete offers
    const { count: offerCount } = await client
      .from("offers")
      .delete()
      .eq("coach_id", coachId);
    if (offerCount) deleted.offers = offerCount;

    // 3. Delete social media posts
    const { count: postCount } = await client
      .from("social_media_posts")
      .delete()
      .eq("coach_id", coachId);
    if (postCount) deleted.social_media_posts = postCount;

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
    const message =
      err instanceof Error ? err.message : "Failed to cascade delete coach";
    console.error("[cascade-delete] Error:", { coachId, error: message });
    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
