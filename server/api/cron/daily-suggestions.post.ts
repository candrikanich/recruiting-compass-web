/**
 * POST /api/cron/daily-suggestions
 * Scheduled cron job to refresh suggestions for all active athletes
 * Can be triggered manually or via Netlify scheduled functions
 *
 * Security: Requires CRON_SECRET environment variable
 */

import { defineEventHandler, createError, getHeader } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { triggerSuggestionUpdate } from "~/server/utils/triggerSuggestionUpdate";

interface CronResult {
  total: number;
  updated: number;
  failed: number;
  errors: Array<{ athleteId: string; error: string }>;
}

export default defineEventHandler(async (event) => {
  try {
    // Verify cron secret for security
    const cronSecret = getHeader(event, "x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized: Invalid cron secret",
      });
    }

    const supabase = createServerSupabaseClient();

    // Fetch all active athletes (users with role='student')
    const response = await supabase
      .from("users")
      .select("id")
      .eq("role", "student");
    const { data: athletes, error: fetchError } = response as {
      data: Array<{ id: string }> | null;
      error: any;
    };

    if (fetchError || !athletes) {
      throw createError({
        statusCode: 500,
        message: `Failed to fetch athletes: ${fetchError?.message || "Unknown error"}`,
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
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(
          `Failed to update suggestions for athlete ${athlete.id}:`,
          error,
        );
      }
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to run daily suggestions cron job",
    });
  }
});
