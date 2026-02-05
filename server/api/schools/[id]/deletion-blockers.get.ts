import { defineEventHandler, getRouterParam } from "h3";
import { serverSupabaseClient } from "#supabase/server";

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

  const client = await serverSupabaseClient(event);

  const blockers: BlockerInfo[] = [];

  // Check all tables with foreign key constraints to schools
  const tables = [
    { name: "coaches", column: "school_id" },
    { name: "interactions", column: "school_id" },
    { name: "offers", column: "school_id" },
    { name: "school_status_history", column: "school_id" },
    { name: "social_media_posts", column: "school_id" },
    { name: "documents", column: "school_id" },
    { name: "events", column: "school_id" },
    { name: "suggestion", column: "related_school_id" },
  ];

  for (const { name, column } of tables) {
    try {
      const { count, error } = await client
        .from(name)
        .select("*", { count: "exact", head: true })
        .eq(column, schoolId);

      if (error) {
        console.error(`Error checking ${name}:`, error);
        continue;
      }

      if (count && count > 0) {
        blockers.push({
          table: name,
          count,
          column,
        });
      }
    } catch (err) {
      console.error(`Error querying ${name}:`, err);
    }
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
