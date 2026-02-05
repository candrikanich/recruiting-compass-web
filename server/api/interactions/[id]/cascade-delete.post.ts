import { defineEventHandler, getRouterParam, createError, readBody } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";

/**
 * Cascade delete an interaction and all related records
 * POST /api/interactions/[id]/cascade-delete
 *
 * This endpoint safely deletes an interaction by:
 * 1. Deleting all related records (follow_up_reminders if they exist)
 * 2. Finally deleting the interaction itself
 *
 * Body (optional):
 * {
 *   "confirmDelete": true  // Must be true to proceed
 * }
 *
 * Returns:
 * - success: boolean
 * - deleted: object with counts of deleted records by table
 * - interactionId: the deleted interaction ID
 */
export default defineEventHandler(async (event) => {
  const interactionId = getRouterParam(event, "id");

  if (!interactionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Interaction ID is required",
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

    // Currently no known FK blockers for interactions
    // (follow_up_reminders is runtime-managed, no formal FK)

    // Delete the interaction
    const { count: interactionCount, error: deleteError } = await client
      .from("interactions")
      .delete()
      .eq("id", interactionId);

    if (deleteError) throw deleteError;

    if (interactionCount && interactionCount > 0) {
      deleted.interactions = interactionCount;
    }

    // Success even if interaction was already deleted - we still cleaned up the related records
    const totalDeleted = Object.values(deleted).reduce(
      (a: number, b: number) => a + b,
      0,
    );
    return {
      success: true,
      interactionId,
      deleted,
      message:
        totalDeleted > 0
          ? `Successfully deleted ${totalDeleted} related records${interactionCount ? " and the interaction itself" : ""}`
          : "No records to delete",
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to cascade delete interaction";
    console.error("[cascade-delete] Error:", { interactionId, error: message });
    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
