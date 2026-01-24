/**
 * Admin endpoint to batch fetch logos for all schools
 * POST /api/admin/batch-fetch-logos
 *
 * Requires: Authorization header with Bearer token
 * RESTRICTED: Athletes only (admin operation, parents have read-only access)
 */

import { defineEventHandler } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { batchFetchLogos } from "~/server/utils/batchFetchLogos";
import { requireAuth, assertNotParent } from "~/server/utils/auth";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("admin/batch-fetch-logos");

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();

    // Ensure requesting user is not a parent (admin operation)
    await assertNotParent(user.id, supabase);

    logger.info("Batch fetch logos endpoint called");

    return await batchFetchLogos(user.id);
  } catch (error) {
    logger.error("Batch fetch logos failed", error);
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error ? error.message : "Failed to batch fetch logos",
    });
  }
});
