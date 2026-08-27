import { defineEventHandler } from "h3";
import { checkDeletionBlockers } from "~/server/utils/entityDeletion";

/**
 * Diagnose what records are preventing interaction deletion
 * GET /api/interactions/[id]/deletion-blockers
 *
 * Interactions have no known FK blockers (follow_up_reminders is
 * runtime-managed with no formal FK), so `blockers` is always empty.
 */
export default defineEventHandler((event) =>
  checkDeletionBlockers(event, {
    entityTable: "interactions",
    entityNoun: "interaction",
    idKey: "interactionId",
    children: [],
  }),
);
