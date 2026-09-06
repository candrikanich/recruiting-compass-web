/**
 * GET /api/cron/inbound-email-purge
 * Weekly retention sweep for raw_inbound_emails (issue #586 Phase 1) — the
 * raw webhook payload is kept only long enough to debug a parsing failure,
 * then purged. inbound_email_drafts (the parsed/matched result) is untouched
 * — it persists until the player confirms or discards it (Phase 2).
 *
 * Security: CRON_SECRET via withCronRun (Bearer or x-cron-secret).
 */
import { defineEventHandler } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { withCronRun } from "~/server/utils/cronRunner";

const logger = createLogger("cron/inbound-email-purge");

const RAW_EMAIL_RETENTION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export default defineEventHandler(async (event) =>
  withCronRun(event, "inbound-email-purge", async (ctx) => {
    const supabase = useSupabaseAdmin();

    const { data: deleted, error } = await supabase
      .from("raw_inbound_emails")
      .delete()
      .lt("created_at", daysAgo(RAW_EMAIL_RETENTION_DAYS))
      .select("id");
    if (error) logger.error("Failed to purge raw_inbound_emails", error);

    const result = { deletedRawEmails: deleted?.length ?? 0 };
    ctx.setProcessed(result.deletedRawEmails);
    logger.info("Raw inbound email purge complete", result);
    return result;
  }),
);
