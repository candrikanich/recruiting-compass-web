/**
 * POST /api/athlete/fit-scores/recalculate-all
 * DEPRECATED — returns no-op success response.
 * Fit signals are now calculated on-the-fly from school academic data.
 */

import { defineEventHandler } from "h3";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "athlete/fit-scores");
  logger.info("Deprecated batch recalculation endpoint called");
  return {
    success: true,
    updated: 0,
    failed: 0,
    message:
      "Batch fit score recalculation is no longer supported. Fit signals are calculated on-the-fly from school academic data.",
  };
});
