/**
 * POST /api/cron/daily-suggestions
 * Scheduled cron job to refresh suggestions for all active athletes
 * Triggered by Vercel Cron (daily at 07:00 UTC) or manually.
 *
 * Security: Vercel sends CRON_SECRET as "Authorization: Bearer <secret>".
 * Manual callers may also pass it as "x-cron-secret: <secret>".
 */

import { defineEventHandler, createError, getHeader } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { triggerSuggestionUpdate } from "~/server/utils/triggerSuggestionUpdate";

interface CronResult {
  total: number;
  updated: number;
  failed: number;
  errors: Array<{ athleteId: string; error: string }>;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "cron/daily-suggestions");
  try {
    // Verify cron secret — Vercel sends "Authorization: Bearer <CRON_SECRET>",
    // manual callers may use the legacy "x-cron-secret" header.
    const expectedSecret = process.env.CRON_SECRET;
    const authHeader = getHeader(event, "authorization");
    const legacyHeader = getHeader(event, "x-cron-secret");
    const bearerSecret = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;
    const providedSecret = bearerSecret ?? legacyHeader;

    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized: Invalid cron secret",
      });
    }

    const supabase = createServerSupabaseClient();

    // Fetch all active athletes (users with role='player')
    const response = await supabase
      .from("users")
      .select("id")
      .eq("role", "player");
    const { data: athletes, error: fetchError } = response as {
      data: Array<{ id: string }> | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

    if (fetchError || !athletes) {
      throw createError({
        statusCode: 500,
        message: "Failed to fetch athletes",
      });
    }

    const result: CronResult = {
      total: athletes.length,
      updated: 0,
      failed: 0,
      errors: [],
    };

    // Process each athlete sequentially to avoid overload
    for (const athlete of athletes) {
      try {
        await triggerSuggestionUpdate(supabase, athlete.id, "daily_refresh");
        result.updated++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          athleteId: athlete.id,
          error: "Processing failed",
        });
        logger.error(
          `Failed to update suggestions for athlete ${athlete.id}`,
          error,
        );
      }
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }

    logger.error("Unexpected error in cron/daily-suggestions", error);
    throw createError({
      statusCode: 500,
      message: "Failed to run daily suggestions cron job",
    });
  }
});
