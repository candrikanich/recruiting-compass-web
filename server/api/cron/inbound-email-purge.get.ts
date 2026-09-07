/**
 * GET /api/cron/inbound-email-purge
 * Weekly retention sweep for raw_inbound_emails (issue #586 Phase 1) — the
 * raw webhook payload is kept only long enough to debug a parsing failure,
 * then purged. inbound_email_drafts (the parsed/matched result) is untouched
 * — it persists until the player confirms or discards it (Phase 2).
 *
 * Phase 3 Task 3 extends this to also purge orphaned `raw_inbound_attachments`
 * (+ their storage objects) — attachments staged with a draft that ended up
 * discarded, or was never confirmed within the retention window. Attachments
 * on a *confirmed* draft are never touched here: their storage object is now
 * referenced by a live `documents.file_url` row.
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

async function purgeOrphanedAttachments(supabase: ReturnType<typeof useSupabaseAdmin>): Promise<number> {
  const { data: nonConfirmedDrafts, error: draftsError } = await supabase
    .from("inbound_email_drafts")
    .select("id")
    .neq("status", "confirmed");
  if (draftsError) {
    logger.error("Failed to list non-confirmed drafts for attachment purge", draftsError);
    return 0;
  }
  const draftIds = (nonConfirmedDrafts ?? []).map((draft) => draft.id);
  if (draftIds.length === 0) return 0;

  const { data: orphaned, error: attachmentsError } = await supabase
    .from("raw_inbound_attachments")
    .select("id, storage_path")
    .in("draft_id", draftIds)
    .lt("created_at", daysAgo(RAW_EMAIL_RETENTION_DAYS));
  if (attachmentsError) {
    logger.error("Failed to list orphaned raw_inbound_attachments", attachmentsError);
    return 0;
  }
  if (!orphaned || orphaned.length === 0) return 0;

  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove(orphaned.map((attachment) => attachment.storage_path));
  if (storageError) {
    // Log and still drop the DB rows below — an orphaned storage object
    // outlives its row, which is a smaller problem than the row (and its
    // reference to a to-be-deleted draft) sticking around forever because a
    // storage error keeps blocking the delete.
    logger.error("Failed to remove orphaned inbound attachment storage objects", storageError);
  }

  const { error: deleteError } = await supabase
    .from("raw_inbound_attachments")
    .delete()
    .in(
      "id",
      orphaned.map((attachment) => attachment.id),
    );
  if (deleteError) {
    logger.error("Failed to purge orphaned raw_inbound_attachments rows", deleteError);
    return 0;
  }

  return orphaned.length;
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

    const deletedOrphanedAttachments = await purgeOrphanedAttachments(supabase);

    const result = { deletedRawEmails: deleted?.length ?? 0, deletedOrphanedAttachments };
    ctx.setProcessed(result.deletedRawEmails + result.deletedOrphanedAttachments);
    logger.info("Raw inbound email purge complete", result);
    return result;
  }),
);
