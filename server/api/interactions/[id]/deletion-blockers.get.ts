import { defineEventHandler, getRouterParam, createError } from "h3";
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
  try {
    const interactionId = getRouterParam(event, "id");

    if (!interactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Interaction ID is required",
      });
    }

    const blockers: BlockerInfo[] = [];

    // Currently no known FK blockers for interactions
    // (follow_up_reminders is runtime-managed, no formal FK in schema)

    const canDelete = blockers.length === 0;

    let message = "Interaction can be deleted successfully.";
    if (!canDelete) {
      const blockerList = blockers
        .map((b) => `${b.count} ${b.table}`)
        .join(", ");
      message = `Cannot delete this interaction. It has: ${blockerList}. Remove these records first.`;
    }

    logger.info("Deletion blockers checked", { interactionId, canDelete });

    return {
      interactionId,
      canDelete,
      blockers,
      message,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to check deletion blockers", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to check deletion blockers",
    });
  }
});
