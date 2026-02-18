import { defineEventHandler, getRouterParam, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

interface BlockerInfo {
  table: string;
  count: number;
  column: string;
}

/**
 * Diagnose what records are preventing school deletion
 * GET /api/schools/[id]/deletion-blockers
 *
 * Returns:
 * - blockers: Array of tables with records referencing this school
 * - canDelete: boolean indicating if school can be deleted
 * - message: User-friendly message explaining what's blocking deletion
 */
export default defineEventHandler(async (event) => {
  const schoolId = getRouterParam(event, "id");

  if (!schoolId) {
    throw createError({
      statusCode: 400,
      statusMessage: "School ID is required",
    });
  }

  const client = createServerSupabaseClient();
  const logger = useLogger(event, "schools/deletion-blockers");

  const blockers: BlockerInfo[] = [];

  // Check coaches
  const { count: coachCount, error: coachError } = await client
    .from("coaches")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (coachError) {
    logger.warn("Failed to count school coaches", coachError);
  }
  if (coachCount && coachCount > 0) {
    blockers.push({ table: "coaches", count: coachCount, column: "school_id" });
  }

  // Check interactions
  const { count: interactionCount, error: interactionError } = await client
    .from("interactions")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (interactionError) {
    logger.warn("Failed to count school interactions", interactionError);
  }
  if (interactionCount && interactionCount > 0) {
    blockers.push({
      table: "interactions",
      count: interactionCount,
      column: "school_id",
    });
  }

  // Check offers
  const { count: offerCount, error: offerError } = await client
    .from("offers")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (offerError) {
    logger.warn("Failed to count school offers", offerError);
  }
  if (offerCount && offerCount > 0) {
    blockers.push({ table: "offers", count: offerCount, column: "school_id" });
  }

  // Check school_status_history
  const { count: historyCount, error: historyError } = await client
    .from("school_status_history")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (historyError) {
    logger.warn("Failed to count school status history", historyError);
  }
  if (historyCount && historyCount > 0) {
    blockers.push({
      table: "school_status_history",
      count: historyCount,
      column: "school_id",
    });
  }

  // Check social_media_posts
  const { count: postCount, error: postError } = await client
    .from("social_media_posts")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (postError) {
    logger.warn("Failed to count school social media posts", postError);
  }
  if (postCount && postCount > 0) {
    blockers.push({
      table: "social_media_posts",
      count: postCount,
      column: "school_id",
    });
  }

  // Check documents
  const { count: docCount, error: docError } = await client
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (docError) {
    logger.warn("Failed to count school documents", docError);
  }
  if (docCount && docCount > 0) {
    blockers.push({
      table: "documents",
      count: docCount,
      column: "school_id",
    });
  }

  // Check events
  const { count: eventCount, error: eventError } = await client
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (eventError) {
    logger.warn("Failed to count school events", eventError);
  }
  if (eventCount && eventCount > 0) {
    blockers.push({ table: "events", count: eventCount, column: "school_id" });
  }

  // Check suggestions
  const { count: suggestionCount, error: suggestionError } = await client
    .from("suggestion")
    .select("*", { count: "exact", head: true })
    .eq("related_school_id", schoolId);
  if (suggestionError) {
    logger.warn("Failed to count school suggestions", suggestionError);
  }
  if (suggestionCount && suggestionCount > 0) {
    blockers.push({
      table: "suggestion",
      count: suggestionCount,
      column: "related_school_id",
    });
  }

  const canDelete = blockers.length === 0;

  let message = "School can be deleted successfully.";
  if (!canDelete) {
    const blockerList = blockers.map((b) => `${b.count} ${b.table}`).join(", ");
    message = `Cannot delete this school. It has: ${blockerList}. Remove these records first.`;
  }

  return {
    schoolId,
    canDelete,
    blockers,
    message,
  };
});
