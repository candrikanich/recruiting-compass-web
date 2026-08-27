import { defineEventHandler } from "h3";
import { checkDeletionBlockers } from "~/server/utils/entityDeletion";

/**
 * Diagnose what records are preventing coach deletion
 * GET /api/coaches/[id]/deletion-blockers
 */
export default defineEventHandler((event) =>
  checkDeletionBlockers(event, {
    entityTable: "coaches",
    entityNoun: "coach",
    idKey: "coachId",
    children: [
      { table: "interactions", column: "coach_id" },
      { table: "offers", column: "coach_id" },
    ],
  }),
);
