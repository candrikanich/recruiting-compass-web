/**
 * GET /api/cron/weekly-digest
 * Scheduled cron: send each athlete their Weekly Recruiting Recap, gated per
 * user by `notification_preferences` (weekly_digest). Email when email_enabled;
 * in-app digest row when push_enabled. Triggered by Vercel Cron (Mondays) or
 * manually.
 *
 * Security: Vercel sends CRON_SECRET as "Authorization: Bearer <secret>".
 * Manual callers may also pass it as "x-cron-secret: <secret>".
 */

import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { withCronRun } from "~/server/utils/cronRunner";
import {
  getNotificationPrefs,
  prefFor,
} from "~/server/utils/notificationPreferences";
import { buildWeeklyDigestData } from "~/server/utils/weeklyDigest";
import { sendRecurringEmail } from "~/server/utils/recurringEmail";

interface CronResult {
  total: number;
  processed: number;
  failed: number;
  emails: number;
  inApp: number;
}

const DIGEST_SUBJECT = "Your Weekly Recruiting Recap";

export default defineEventHandler(async (event) =>
  withCronRun(event, "weekly-digest", async (ctx) => {
    const logger = useLogger(event, "cron/weekly-digest");
    const supabase = createServerSupabaseClient();
    const unsubscribeSecret = useRuntimeConfig().unsubscribeSecret;
    const now = new Date();
    const weekKey = now.toISOString().slice(0, 10);

    const { data: athletes, error: fetchError } = (await supabase
      .from("users")
      .select("id, email")
      .eq("role", "player")) as {
      data: Array<{ id: string; email: string | null }> | null;
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
      processed: 0,
      failed: 0,
      emails: 0,
      inApp: 0,
    };

    for (const athlete of athletes) {
      try {
        const prefs = await getNotificationPrefs(athlete.id, supabase);
        const pref = prefFor(prefs, "weekly_digest");
        if (!pref.push_enabled && !pref.email_enabled) {
          result.processed++;
          continue;
        }

        const digest = await buildWeeklyDigestData(athlete.id, supabase, now);
        if (!digest) {
          result.processed++;
          continue;
        }

        if (pref.email_enabled && athlete.email) {
          const emailResult = await sendRecurringEmail({
            to: athlete.email,
            subject: DIGEST_SUBJECT,
            template: "weekly-digest",
            data: digest as unknown as Record<string, unknown>,
            idempotencyKey: `weekly-digest-${athlete.id}-${weekKey}`,
            unsubscribeSecret,
          });
          if (emailResult.success && !emailResult.skipped) result.emails++;
        }

        if (pref.push_enabled) {
          await supabase.from("notifications").insert([
            {
              user_id: athlete.id,
              type: "daily_digest",
              title: DIGEST_SUBJECT,
              message: digest.lines.join("\n"),
              scheduled_for: now.toISOString(),
              priority: "low",
            },
          ]);
          result.inApp++;
        }

        result.processed++;
      } catch (err) {
        result.failed++;
        logger.error(`Failed weekly digest for ${athlete.id}`, err);
      }
    }

    ctx.setProcessed(result.total);
    ctx.setFailed(result.failed);
    return result;
  }),
);
