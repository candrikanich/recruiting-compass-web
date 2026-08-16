/**
 * GET /api/cron/cleanup-expired-invites
 * Daily cron job to:
 *   1. Mark pending invites past their expiry as 'expired'
 *   2. Hard-delete declined/expired invites older than 7 days
 *
 * Security: Vercel sends CRON_SECRET as "Authorization: Bearer <secret>".
 * Manual callers may also pass it as "x-cron-secret: <secret>".
 */

import { defineEventHandler } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { withCronRun } from "~/server/utils/cronRunner";

const logger = createLogger("cron/cleanup-expired-invites");

const CRON_RUNS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export default defineEventHandler(async (event) =>
  withCronRun(event, "cleanup-expired-invites", async (ctx) => {
    const supabase = useSupabaseAdmin();
    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Step 1: Mark pending invites past their expiry as 'expired'
    const { data: expiredRows, error: expireError } = await supabase
      .from("family_invitations")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", now)
      .select("id");

    if (expireError) {
      logger.error("Failed to mark expired invites", expireError);
    } else {
      logger.info("Marked invites as expired", {
        count: expiredRows?.length ?? 0,
      });
    }

    // Step 2: Hard-delete declined invites with 7-day grace period
    const { data: declinedRows, error: declineDeleteError } = await supabase
      .from("family_invitations")
      .delete()
      .eq("status", "declined")
      .lt("declined_at", sevenDaysAgo)
      .select("id");

    if (declineDeleteError) {
      logger.error("Failed to delete declined invites", declineDeleteError);
    } else {
      logger.info("Deleted declined invites", {
        count: declinedRows?.length ?? 0,
      });
    }

    // Step 3: Hard-delete expired invites older than 7 days
    const { data: expiredDeletedRows, error: expiredDeleteError } =
      await supabase
        .from("family_invitations")
        .delete()
        .eq("status", "expired")
        .lt("expires_at", sevenDaysAgo)
        .select("id");

    if (expiredDeleteError) {
      logger.error("Failed to delete expired invites", expiredDeleteError);
    } else {
      logger.info("Deleted expired invites", {
        count: expiredDeletedRows?.length ?? 0,
      });
    }

    // Step 4: Prune cron_runs history older than 30 days (self-housekeeping).
    const cronRunsCutoff = new Date(
      Date.now() - CRON_RUNS_RETENTION_MS,
    ).toISOString();
    const { error: cronRunsPruneError } = await supabase
      .from("cron_runs")
      .delete()
      .lt("started_at", cronRunsCutoff);
    if (cronRunsPruneError) {
      logger.error("Failed to prune cron_runs", cronRunsPruneError);
    }

    const markedExpired = expiredRows?.length ?? 0;
    const deletedDeclined = declinedRows?.length ?? 0;
    const deletedExpired = expiredDeletedRows?.length ?? 0;
    ctx.setProcessed(markedExpired + deletedDeclined + deletedExpired);

    return { markedExpired, deletedDeclined, deletedExpired };
  }),
);
