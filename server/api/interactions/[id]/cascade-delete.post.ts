import {
  defineEventHandler,
  createError,
  readBody,
  getHeader,
  getCookie,
} from "h3";
import { z } from "zod";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";
import { requireUuidParam } from "~/server/utils/validation";

const cascadeDeleteSchema = z.object({ confirmDelete: z.boolean().optional() });

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
  const logger = useLogger(event, "interactions/cascade-delete");

  // Auth first, then validate inputs
  await requireAuth(event);
  const interactionId = requireUuidParam(event, "id");

  let body: z.infer<typeof cascadeDeleteSchema>;
  try {
    body = cascadeDeleteSchema.parse(await readBody(event).catch(() => ({})));
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid request body" });
  }

  const { confirmDelete } = body;
  if (!confirmDelete) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Must set "confirmDelete": true in request body to proceed',
    });
  }

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
  const client = createServerSupabaseUserClient(token);
  const deleted: Record<string, number> = {};

  try {
    // Delete in dependency order (careful of FK constraints)

    // 1. Delete follow-up reminders (follow_up_reminders_interaction_id_fkey)
    const { count: reminderCount, error: reminderError } = await client
      .from("follow_up_reminders")
      .delete()
      .eq("interaction_id", interactionId);
    if (reminderError) throw reminderError;
    if (reminderCount) deleted.follow_up_reminders = reminderCount;

    // 2. Delete the interaction
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
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to cascade delete interaction", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to cascade delete interaction",
    });
  }
});
