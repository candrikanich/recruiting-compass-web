/**
 * GET /api/cron/email-events-purge
 * Weekly retention sweep: deletes email_events rows older than 30 days.
 * This table is append-only from a public webhook and otherwise grows
 * unbounded; 30 days is enough for admins to review recent delivery issues.
 *
 * Security: CRON_SECRET via withCronRun (Bearer or x-cron-secret).
 */
import { defineEventHandler } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { withCronRun } from "~/server/utils/cronRunner";

const logger = createLogger("cron/email-events-purge");

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 30;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export default defineEventHandler(async (event) =>
  withCronRun(event, "email-events-purge", async (ctx) => {
    const supabase = useSupabaseAdmin();

    const { data: deleted, error } = await supabase
      .from("email_events")
      .delete()
      .lt("created_at", daysAgo(RETENTION_DAYS))
      .select("id");

    if (error) logger.error("Failed to prune email_events", error);

    const result = { deletedEmailEvents: deleted?.length ?? 0 };
    ctx.setProcessed(result.deletedEmailEvents);
    logger.info("Email events prune complete", result);
    return result;
  }),
);
