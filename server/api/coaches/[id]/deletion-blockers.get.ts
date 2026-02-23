import { defineEventHandler, createError, getHeader } from "h3";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";
import { requireAuth } from "~/server/utils/auth";

interface BlockerInfo {
  table: string;
  count: number;
  column: string;
}

/**
 * Diagnose what records are preventing coach deletion
 * GET /api/coaches/[id]/deletion-blockers
 *
 * Returns:
 * - blockers: Array of tables with records referencing this coach
 * - canDelete: boolean indicating if coach can be deleted
 * - message: User-friendly message explaining what's blocking deletion
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event);

  const coachId = requireUuidParam(event, "id");

  const token = getHeader(event, "authorization")?.slice(7) ?? "";
  const client = createServerSupabaseUserClient(token);
  const logger = useLogger(event, "coaches/deletion-blockers");

  const blockers: BlockerInfo[] = [];

  // Check interactions
  const { count: interactionCount, error: interactionError } = await client
    .from("interactions")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", coachId);
  if (interactionError) {
    logger.warn("Failed to count coach interactions", interactionError);
  }
  if (interactionCount && interactionCount > 0) {
    blockers.push({
      table: "interactions",
      count: interactionCount,
      column: "coach_id",
    });
  }

  // Check offers
  const { count: offerCount, error: offerError } = await client
    .from("offers")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", coachId);
  if (offerError) {
    logger.warn("Failed to count coach offers", offerError);
  }
  if (offerCount && offerCount > 0) {
    blockers.push({ table: "offers", count: offerCount, column: "coach_id" });
  }

  // Check social_media_posts
  const { count: postCount, error: postError } = await client
    .from("social_media_posts")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", coachId);
  if (postError) {
    logger.warn("Failed to count coach social media posts", postError);
  }
  if (postCount && postCount > 0) {
    blockers.push({
      table: "social_media_posts",
      count: postCount,
      column: "coach_id",
    });
  }

  const canDelete = blockers.length === 0;

  let message = "Coach can be deleted successfully.";
  if (!canDelete) {
    const blockerList = blockers.map((b) => `${b.count} ${b.table}`).join(", ");
    message = `Cannot delete this coach. It has: ${blockerList}. Remove these records first.`;
  }

  return {
    coachId,
    canDelete,
    blockers,
    message,
  };
});
