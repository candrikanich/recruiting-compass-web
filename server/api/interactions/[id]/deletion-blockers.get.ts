import { defineEventHandler, getHeader, getCookie, createError } from "h3";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { requireUuidParam } from "~/server/utils/validation";
import { useLogger } from "~/server/utils/logger";

interface BlockerInfo {
  table: string;
  count: number;
  column: string;
}

/**
 * Diagnose what records are preventing interaction deletion
 * GET /api/interactions/[id]/deletion-blockers
 *
 * Returns:
 * - blockers: Array of tables with records referencing this interaction
 * - canDelete: boolean indicating if interaction can be deleted
 * - message: User-friendly message explaining what's blocking deletion
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "interactions/deletion-blockers");
  logger.info("Checking deletion blockers");

  // Require auth before revealing schema info
  await requireAuth(event);
  const interactionId = requireUuidParam(event, "id");

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

  // Verify the interaction exists and is visible to this user (RLS-scoped).
  // A null row means it is missing or not owned — return 404 rather than a
  // misleading canDelete:true for a resource the caller cannot see.
  const { data: interaction, error: existenceError } = await client
    .from("interactions")
    .select("id")
    .eq("id", interactionId)
    .maybeSingle();
  if (existenceError) {
    logger.error("Failed to verify interaction existence", existenceError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to check deletion blockers",
    });
  }
  if (!interaction) {
    throw createError({
      statusCode: 404,
      statusMessage: "Interaction not found",
    });
  }

  const blockers: BlockerInfo[] = [];

  // Currently no known FK blockers for interactions
  // (follow_up_reminders is runtime-managed, no formal FK in schema)

  const canDelete = blockers.length === 0;

  let message = "Interaction can be deleted successfully.";
  if (!canDelete) {
    const blockerList = blockers.map((b) => `${b.count} ${b.table}`).join(", ");
    message = `Cannot delete this interaction. It has: ${blockerList}. Remove these records first.`;
  }

  return {
    interactionId,
    canDelete,
    blockers,
    message,
  };
});
