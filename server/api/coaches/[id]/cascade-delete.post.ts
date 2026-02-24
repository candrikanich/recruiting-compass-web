import {
  defineEventHandler,
  createError,
  readBody,
  getHeader,
  getCookie,
} from "h3";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";

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
  const logger = useLogger(event, "coaches/cascade-delete");

  // Auth first, then validate inputs
  await requireAuth(event);
  const coachId = requireUuidParam(event, "id");

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

  // Get user's access token for RLS-respecting client
  const authHeader = getHeader(event, "authorization");
  const token: string | null = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : getCookie(event, "sb-access-token") || null;

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized - no authentication token",
    });
  }

  // Use authenticated client to respect RLS policies
  const client = createServerSupabaseUserClient(token);
  const deleted: Record<string, number> = {};

  try {
    // Delete in dependency order (careful of FK constraints)

    // 1. Delete interactions
    const { count: interactionCount, error: interactionError } = await client
      .from("interactions")
      .delete()
      .eq("coach_id", coachId);
    if (interactionError) throw interactionError;
    if (interactionCount) deleted.interactions = interactionCount;

    // 2. Delete offers
    const { count: offerCount, error: offerError } = await client
      .from("offers")
      .delete()
      .eq("coach_id", coachId);
    if (offerError) throw offerError;
    if (offerCount) deleted.offers = offerCount;

    // 3. Delete social media posts
    const { count: postCount, error: postError } = await client
      .from("social_media_posts")
      .delete()
      .eq("coach_id", coachId);
    if (postError) throw postError;
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
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to cascade delete coach", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to cascade delete coach",
    });
  }
});
