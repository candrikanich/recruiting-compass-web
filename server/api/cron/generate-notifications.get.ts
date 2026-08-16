/**
 * GET /api/cron/generate-notifications
 * Scheduled cron: generate in-app notifications for all athletes and send
 * deadline-alert emails, each channel gated per user by `notification_preferences`.
 * Triggered by Vercel Cron (daily) or manually.
 *
 * Security: Vercel sends CRON_SECRET as "Authorization: Bearer <secret>".
 * Manual callers may also pass it as "x-cron-secret: <secret>".
 */

import { defineEventHandler, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { withCronRun } from "~/server/utils/cronRunner";
import { deliverNotificationsForUser } from "~/server/utils/notificationDelivery";

interface CronResult {
  total: number;
  processed: number;
  failed: number;
  inApp: number;
  emails: number;
}

export default defineEventHandler(async (event) =>
  withCronRun(event, "generate-notifications", async (ctx) => {
    const logger = useLogger(event, "cron/generate-notifications");
    const supabase = createServerSupabaseClient();
    const unsubscribeSecret = useRuntimeConfig().unsubscribeSecret;

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
      inApp: 0,
      emails: 0,
    };

    for (const athlete of athletes) {
      try {
        const { inApp, emails } = await deliverNotificationsForUser(
          athlete.id,
          athlete.email,
          supabase,
          unsubscribeSecret,
        );
        result.inApp += inApp;
        result.emails += emails;
        result.processed++;
      } catch (err) {
        result.failed++;
        logger.error(`Failed to deliver notifications for ${athlete.id}`, err);
      }
    }

    ctx.setProcessed(result.total);
    ctx.setFailed(result.failed);
    return result;
  }),
);
