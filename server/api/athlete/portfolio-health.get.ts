/**
 * GET /api/athlete/portfolio-health
 * Deprecated — portfolio health has been removed in favour of per-school fit signals.
 */

import { defineEventHandler, createError } from "h3";

export default defineEventHandler(async (_event) => {
  throw createError({
    statusCode: 410,
    statusMessage:
      "Portfolio health has been removed. Use per-school fit signals instead.",
  });
});
