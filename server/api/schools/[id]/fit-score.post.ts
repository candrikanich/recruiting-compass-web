/**
 * POST /api/schools/[id]/fit-score
 * DEPRECATED — 410 Gone
 * Use POST /api/schools/[id]/enrich to update academic data instead.
 */

import { defineEventHandler, createError } from "h3";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "schools/fit-score");
  logger.info(
    "Deprecated endpoint called — use /api/schools/[id]/enrich instead",
  );
  throw createError({
    statusCode: 410,
    statusMessage:
      "Fit score calculation replaced by independent fit signals. Use POST /api/schools/[id]/enrich to update academic data.",
  });
});
