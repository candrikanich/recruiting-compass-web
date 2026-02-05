import { defineEventHandler, getRouterParam, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";

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

  const blockers: BlockerInfo[] = [];

  // Check coaches
  const { count: coachCount } = await client
    .from("coaches")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (coachCount && coachCount > 0) {
    blockers.push({ table: "coaches", count: coachCount, column: "school_id" });
  }

  // Check interactions
  const { count: interactionCount } = await client
    .from("interactions")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (interactionCount && interactionCount > 0) {
    blockers.push({
      table: "interactions",
      count: interactionCount,
      column: "school_id",
    });
  }

  // Check offers
  const { count: offerCount } = await client
    .from("offers")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (offerCount && offerCount > 0) {
    blockers.push({ table: "offers", count: offerCount, column: "school_id" });
  }

  // Check school_status_history
  const { count: historyCount } = await client
    .from("school_status_history")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (historyCount && historyCount > 0) {
    blockers.push({
      table: "school_status_history",
      count: historyCount,
      column: "school_id",
    });
  }

  // Check social_media_posts
  const { count: postCount } = await client
    .from("social_media_posts")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (postCount && postCount > 0) {
    blockers.push({
      table: "social_media_posts",
      count: postCount,
      column: "school_id",
    });
  }

  // Check documents
  const { count: docCount } = await client
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (docCount && docCount > 0) {
    blockers.push({
      table: "documents",
      count: docCount,
      column: "school_id",
    });
  }

  // Check events
  const { count: eventCount } = await client
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (eventCount && eventCount > 0) {
    blockers.push({ table: "events", count: eventCount, column: "school_id" });
  }

  // Check suggestions
  const { count: suggestionCount } = await client
    .from("suggestion")
    .select("*", { count: "exact", head: true })
    .eq("related_school_id", schoolId);
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
