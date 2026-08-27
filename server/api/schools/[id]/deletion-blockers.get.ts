import { defineEventHandler } from "h3";
import { checkDeletionBlockers } from "~/server/utils/entityDeletion";

/**
 * Diagnose what records are preventing school deletion
 * GET /api/schools/[id]/deletion-blockers
 */
export default defineEventHandler((event) =>
  checkDeletionBlockers(event, {
    entityTable: "schools",
    entityNoun: "school",
    idKey: "schoolId",
    children: [
      { table: "coaches", column: "school_id" },
      { table: "interactions", column: "school_id" },
      { table: "offers", column: "school_id" },
      {
        table: "school_status_history",
        column: "school_id",
        label: "status history",
      },
      { table: "documents", column: "school_id" },
      { table: "events", column: "school_id" },
      {
        table: "suggestion",
        column: "related_school_id",
        label: "suggestions",
      },
    ],
  }),
);
