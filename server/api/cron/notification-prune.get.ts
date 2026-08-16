/**
 * GET /api/cron/notification-prune
 * Weekly retention sweep for append-only tables that otherwise grow unbounded:
 *   - notifications: delete read ones older than 30d, and ANY older than 90d.
 *   - parent_view_log / family_code_usage_log: privacy-sensitive access logs,
 *     delete entries older than 180d.
 *
 * Deliberately does NOT touch `deadline_alert_log`: its UNIQUE(user_id,
 * source_table, source_id, alert_days_before) row is the send-dedup guard, so
 * pruning it could re-fire an already-sent deadline alert. It is bounded per
 * deadline by that constraint anyway.
 *
 * All deletes are bulk `.lt()` filters (no per-row loop). Each step's error is
 * logged but does not abort the others.
 *
 * Security: CRON_SECRET via withCronRun (Bearer or x-cron-secret).
 */

import { defineEventHandler } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { withCronRun } from "~/server/utils/cronRunner";

const logger = createLogger("cron/notification-prune");

const DAY_MS = 24 * 60 * 60 * 1000;
const READ_NOTIFICATION_RETENTION_DAYS = 30;
const ANY_NOTIFICATION_RETENTION_DAYS = 90;
const ACCESS_LOG_RETENTION_DAYS = 180;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export default defineEventHandler(async (event) =>
  withCronRun(event, "notification-prune", async (ctx) => {
    const supabase = useSupabaseAdmin();

    // 1. Read notifications past the short retention window.
    const { data: deletedRead, error: readError } = await supabase
      .from("notifications")
      .delete()
      .not("read_at", "is", null)
      .lt("created_at", daysAgo(READ_NOTIFICATION_RETENTION_DAYS))
      .select("id");
    if (readError)
      logger.error("Failed to prune read notifications", readError);

    // 2. Any notification past the long retention window (catches stale unread).
    const { data: deletedStale, error: staleError } = await supabase
      .from("notifications")
      .delete()
      .lt("created_at", daysAgo(ANY_NOTIFICATION_RETENTION_DAYS))
      .select("id");
    if (staleError)
      logger.error("Failed to prune stale notifications", staleError);

    // 3. Parent view log — privacy-sensitive access history.
    const { data: deletedParentViews, error: parentViewError } = await supabase
      .from("parent_view_log")
      .delete()
      .lt("viewed_at", daysAgo(ACCESS_LOG_RETENTION_DAYS))
      .select("id");
    if (parentViewError)
      logger.error("Failed to prune parent_view_log", parentViewError);

    // 4. Family code usage log — audit trail for invite-code actions.
    const { data: deletedCodeUsage, error: codeUsageError } = await supabase
      .from("family_code_usage_log")
      .delete()
      .lt("created_at", daysAgo(ACCESS_LOG_RETENTION_DAYS))
      .select("id");
    if (codeUsageError)
      logger.error("Failed to prune family_code_usage_log", codeUsageError);

    const result = {
      deletedReadNotifications: deletedRead?.length ?? 0,
      deletedStaleNotifications: deletedStale?.length ?? 0,
      deletedParentViewLogs: deletedParentViews?.length ?? 0,
      deletedFamilyCodeUsageLogs: deletedCodeUsage?.length ?? 0,
    };

    ctx.setProcessed(
      result.deletedReadNotifications +
        result.deletedStaleNotifications +
        result.deletedParentViewLogs +
        result.deletedFamilyCodeUsageLogs,
    );
    logger.info("Notification/log prune complete", result);
    return result;
  }),
);
