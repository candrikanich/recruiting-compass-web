/**
 * POST /api/webhooks/inbound-email
 *
 * Resend Inbound webhook receiver (issue #586 Phase 1). A player forwards a
 * coach's email to their family's unique inbound address; Resend parses the
 * MIME message and POSTs the result here, Svix-signed. This handler:
 *   1. Verifies the signature before touching the DB.
 *   2. Resolves the family from the `to` address's token.
 *   3. Stores the raw payload (7-day retention, purged by a cron job).
 *   4. Parses the quoted "On ... wrote:" block to recover the ORIGINAL
 *      coach's name/email/date (the forwarder is the player, not the coach).
 *   5. Matches that email against the family's coaches (never creates one).
 *   6. Inserts one `pending` draft per detected message (a bulk-forwarded
 *      thread yields several) — Phase 2 builds the confirm/discard UI.
 *   7. Stages any attachments (questionnaires, camp invites) to storage +
 *      `raw_inbound_attachments`, tied to the first draft created from this
 *      call — Phase 3 Task 3. They become real `documents` rows only once
 *      that draft is confirmed (see confirm.post.ts).
 *
 * Always returns 200 once past signature verification, even on a partial
 * match or unresolved family — Resend retries on non-2xx, and a malformed
 * forward is not a delivery failure worth retrying.
 */
import { Resend } from "resend";
import { defineEventHandler, readRawBody, getHeaders, createError } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { verifyResendWebhook } from "~/server/utils/verifyResendWebhook";
import { parseInboundToken, resolveFamilyByInboundToken } from "~/server/utils/familyInboundToken";
import { parseForwardedThread, type ParsedForward } from "~/server/utils/parseForwardedEmail";
import { matchCoachByEmail, autoCreateCoachByEmailDomain } from "~/server/utils/matchCoachByEmail";
import { FILE_VALIDATION_RULES } from "~/composables/useFormValidation";
import type { Database, Json } from "~/types/database";

/**
 * The `email.received` webhook payload carries metadata only — Resend never
 * inlines the body (large attachments would blow serverless request-size
 * limits). The full text/html has to be fetched separately via
 * `resend.emails.receiving.get(email_id)` once the webhook lands.
 */
interface ResendInboundPayload {
  type: string;
  data: {
    email_id: string;
    to: string[];
    from: string;
    subject: string;
    created_at: string;
  };
}

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * A segment's own `originalDate` (free text lifted from its "On ... wrote:"
 * / "Sent:" / "Date:" line, e.g. "Mon, Sep 2, 2026 at 3:15 PM") is the true
 * timestamp for THAT message — using the webhook-receipt timestamp for
 * every segment in a bulk-forwarded thread would stamp every draft with the
 * same (wrong) date. Best-effort `Date` parse with a fallback to the
 * webhook's own `created_at` when the free text doesn't parse, mirroring
 * how the single-message path already falls back to `created_at` when
 * nothing was parsed at all.
 */
function resolveOccurredAt(originalDate: string | null | undefined, fallback: string): string {
  if (!originalDate) return fallback;
  const parsed = new Date(originalDate);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

/**
 * Extracts the bare address out of a `"Name <email>"` or plain `email`
 * header value, lowercased for case-insensitive comparison. Never throws —
 * a header that doesn't parse just yields null.
 */
function extractEmailAddress(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const angleMatch = /<([^<>\s]+@[^<>\s]+)>/.exec(headerValue);
  const raw = angleMatch ? angleMatch[1] : headerValue.trim();
  return raw.includes("@") ? raw.toLowerCase() : null;
}

/**
 * Reduces an (attacker-influenceable, third-party) attachment filename to a
 * safe storage-key segment — letters/digits/`.`/`_`/`-` only, repeated dots
 * collapsed (blocks `../` traversal), capped to a sane length. The ORIGINAL
 * filename is kept as-is in `raw_inbound_attachments.filename` /
 * `documents.title` for display — only the storage path uses this.
 */
function sanitizeFilenameForStorage(filename: string): string {
  const safe = filename
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "");
  return (safe || "attachment").slice(0, 200);
}

function isResendInboundPayload(value: unknown): value is ResendInboundPayload {
  if (!value || typeof value !== "object") return false;
  const data = (value as { data?: unknown }).data;
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as { to?: unknown }).to) &&
    typeof (data as { from?: unknown }).from === "string"
  );
}

type RawEmailInsert = Database["public"]["Tables"]["raw_inbound_emails"]["Insert"];
type DraftInsert = Database["public"]["Tables"]["inbound_email_drafts"]["Insert"];
type AttachmentInsert = Database["public"]["Tables"]["raw_inbound_attachments"]["Insert"];

/**
 * Attachment metadata embedded directly in `receiving.get()`'s response
 * (no separate `.attachments.list()` call needed — the installed Resend SDK
 * (6.24.0)'s `GetReceivingEmailResponseSuccess.attachments` already carries
 * this). Fetching the actual bytes still requires a second call per
 * attachment: `receiving.attachments.get({ emailId, id })` returns a signed
 * `download_url`, not inline content.
 */
interface InboundAttachmentMeta {
  id: string;
  filename: string | null;
  size: number;
  content_type: string;
}

/**
 * Downloads, validates, and stages one webhook call's attachments to the
 * `documents` storage bucket + `raw_inbound_attachments`, tied to
 * `draftId`. Attachments arrive at the email level, not per forwarded-thread
 * segment, so a bulk-forwarded thread (multiple drafts from one webhook
 * call) ties them all to the first draft created — in practice the newest
 * message in the chain, which is the one that actually carries them.
 * Best-effort per attachment: a validation failure or download/upload error
 * skips that one file (logged) rather than failing the whole webhook.
 */
async function stageAttachments(
  admin: ReturnType<typeof useSupabaseAdmin>,
  resend: Resend,
  params: {
    emailId: string;
    familyUnitId: string;
    draftId: string;
    attachments: InboundAttachmentMeta[];
  },
  logger: ReturnType<typeof useLogger>,
): Promise<number> {
  const rules = FILE_VALIDATION_RULES.coach_attachment;
  let stagedCount = 0;

  for (const attachment of params.attachments) {
    const filename = attachment.filename ?? `attachment-${attachment.id}`;
    const ext = `.${filename.split(".").pop()?.toLowerCase() ?? ""}`;
    const allowedType = (rules.mimeTypes as readonly string[]).includes(attachment.content_type);
    const allowedExt = (rules.extensions as readonly string[]).includes(ext);
    if (!allowedType || !allowedExt) {
      logger.warn("Skipping inbound attachment: disallowed type", {
        filename,
        contentType: attachment.content_type,
      });
      continue;
    }
    if (attachment.size > rules.maxSize) {
      logger.warn("Skipping inbound attachment: too large", { filename, size: attachment.size });
      continue;
    }

    const { data: signed, error: signedError } = await resend.emails.receiving.attachments.get({
      emailId: params.emailId,
      id: attachment.id,
    });
    if (signedError || !signed?.download_url) {
      logger.error("Failed to get inbound attachment download URL", signedError);
      continue;
    }

    let fileBuffer: ArrayBuffer;
    try {
      const downloadResponse = await fetch(signed.download_url);
      if (!downloadResponse.ok) {
        throw new Error(`Attachment download failed with status ${downloadResponse.status}`);
      }
      fileBuffer = await downloadResponse.arrayBuffer();
    } catch (err) {
      logger.error("Failed to download inbound attachment", err);
      continue;
    }

    const storagePath = `${params.familyUnitId}/inbound/${params.draftId}-${sanitizeFilenameForStorage(filename)}`;
    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(storagePath, Buffer.from(fileBuffer), {
        contentType: attachment.content_type,
        upsert: false,
      });
    if (uploadError) {
      logger.error("Failed to upload inbound attachment to storage", uploadError);
      continue;
    }

    const attachmentInsert: AttachmentInsert = {
      draft_id: params.draftId,
      family_unit_id: params.familyUnitId,
      filename,
      content_type: attachment.content_type,
      storage_path: storagePath,
    };
    const { error: insertError } = await admin.from("raw_inbound_attachments").insert(attachmentInsert);
    if (insertError) {
      logger.error("Failed to stage raw_inbound_attachments row", insertError);
      continue;
    }

    stagedCount++;
  }

  return stagedCount;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "webhooks/inbound-email");

  let payload: unknown;
  try {
    const rawBody = (await readRawBody(event)) ?? "";
    const headers = getHeaders(event);
    payload = verifyResendWebhook(rawBody, headers);
  } catch (err) {
    logger.warn("Rejected inbound email webhook: bad signature", err);
    throw createError({ statusCode: 401, statusMessage: "Invalid webhook signature" });
  }

  if (!isResendInboundPayload(payload)) {
    logger.warn("Ignoring inbound webhook with unrecognized shape", {
      type: (payload as { type?: unknown } | null)?.type,
    });
    return { ok: true, skipped: "unrecognized-payload" };
  }

  const admin = useSupabaseAdmin();
  const toAddress = payload.data.to[0] ?? "";
  const token = parseInboundToken(toAddress);
  const familyUnitId = token ? await resolveFamilyByInboundToken(admin, token) : null;

  if (!familyUnitId) {
    logger.warn("Inbound email addressed to unknown/malformed token", { toAddress });
    return { ok: true, skipped: "unknown-family" };
  }

  const rawInsert: RawEmailInsert = {
    family_unit_id: familyUnitId,
    payload: payload as unknown as Json,
  };
  const { data: rawRow, error: rawError } = await admin
    .from("raw_inbound_emails")
    .insert(rawInsert)
    .select("id")
    .single();
  if (rawError) {
    logger.error("Failed to store raw inbound email", rawError);
  }

  let bodyText: string | null = null;
  let inboundAttachments: InboundAttachmentMeta[] = [];
  try {
    const { data: fullEmail, error: fetchError } = await getResend().emails.receiving.get(
      payload.data.email_id,
    );
    if (fetchError) throw new Error(fetchError.message);
    bodyText = fullEmail?.text ?? null;
    inboundAttachments = fullEmail?.attachments ?? [];
  } catch (err) {
    logger.error("Failed to fetch full inbound email body", err);
  }

  // A bulk-forwarded thread (player forwards the whole conversation, not
  // just the latest message) yields more than one segment here — one per
  // "On ... wrote:" block — and gets one draft per segment below. Today's
  // normal case (0 or 1 quote markers) always comes back as exactly one
  // segment covering the whole body, so that path is unchanged.
  const allSegments: { parsed: ParsedForward | null; segmentText: string | null }[] = bodyText
    ? parseForwardedThread(bodyText)
    : [{ parsed: null, segmentText: null }];

  // A coach's reply commonly quotes the player's OWN earlier message
  // ("On ... wrote:" pointing at the forwarder, not the coach) — that quote
  // is itself a valid segment boundary but not a second real message, so it
  // must not become a second draft. Drop any segment whose parsed sender is
  // the forwarder (the player who did the forwarding) — the highest-value,
  // lowest-cost filter; a full family-member-email check would need an
  // extra query this handler doesn't otherwise need.
  const forwarderEmail = extractEmailAddress(payload.data.from);
  const segments = allSegments.filter((segment) => {
    const senderEmail = extractEmailAddress(segment.parsed?.senderEmail ?? null);
    return !(forwarderEmail && senderEmail && senderEmail === forwarderEmail);
  });

  const { data: familyMembers } = await admin
    .from("family_members")
    .select("user_id")
    .eq("family_unit_id", familyUnitId);

  const webhookReceivedAt = payload.data.created_at ?? new Date().toISOString();
  let matchedCount = 0;
  let autoCreatedCount = 0;
  let failedCount = 0;
  let firstDraftId: string | null = null;

  for (const segment of segments) {
    const parsed = segment.parsed;
    const existingMatch = await matchCoachByEmail(admin, {
      familyUnitId,
      email: parsed?.senderEmail,
    });
    // No existing coach for this sender — try a school-domain match before
    // falling back to an unmatched draft (see autoCreateCoachByEmailDomain's
    // doc comment for why this never runs on the public Contact-Player flow).
    const { coachId, schoolId } = existingMatch.coachId
      ? existingMatch
      : await autoCreateCoachByEmailDomain(admin, {
          familyUnitId,
          senderEmail: parsed?.senderEmail,
          senderName: parsed?.senderName,
        });

    const draftInsert: DraftInsert = {
      family_unit_id: familyUnitId,
      raw_email_id: rawRow?.id ?? null,
      matched_coach_id: coachId,
      matched_school_id: schoolId,
      sender_name: parsed?.senderName ?? null,
      sender_email: parsed?.senderEmail ?? null,
      subject: payload.data.subject ?? null,
      body_text: segment.segmentText,
      occurred_at: resolveOccurredAt(parsed?.originalDate, webhookReceivedAt),
      status: "pending",
    };

    const { data: newDraft, error: draftError } = await admin
      .from("inbound_email_drafts")
      .insert(draftInsert)
      .select("id")
      .single();
    if (draftError) {
      // Continue with the remaining segments rather than 500ing partway
      // through a multi-draft thread — Resend retries on non-2xx, and a
      // retry here would reprocess the whole body and duplicate every
      // segment already inserted above. One segment's insert failure isn't
      // a delivery failure worth losing the rest of the thread over.
      logger.error("Failed to create inbound email draft for one segment", draftError);
      failedCount++;
      continue;
    }
    if (!firstDraftId && newDraft?.id) firstDraftId = newDraft.id;

    if (familyMembers && familyMembers.length > 0) {
      const { error: notifyError } = await admin.from("notifications").insert(
        familyMembers.map((member) => ({
          user_id: member.user_id,
          type: "inbound_interaction",
          title: "New coach email detected",
          message: parsed?.senderName
            ? `A forwarded email from ${parsed.senderName} is ready to review.`
            : "A forwarded email is ready to review.",
          action_url: "/inbox/inbound-drafts",
          related_entity_id: newDraft?.id ?? null,
          related_entity_type: "inbound_email_draft",
        })),
      );
      if (notifyError) {
        // Never fail the webhook over a notification — Resend already
        // delivered successfully and the draft already exists.
        logger.error("Failed to notify family of new inbound draft", notifyError);
      }
    }

    if (coachId) matchedCount++;
    if (!existingMatch.coachId && coachId) autoCreatedCount++;
  }

  let stagedAttachmentCount = 0;
  if (firstDraftId && inboundAttachments.length > 0) {
    stagedAttachmentCount = await stageAttachments(
      admin,
      getResend(),
      { emailId: payload.data.email_id, familyUnitId, draftId: firstDraftId, attachments: inboundAttachments },
      logger,
    );
  }

  logger.info("Inbound email draft(s) created", {
    familyUnitId,
    draftCount: segments.length - failedCount,
    failedCount,
    matchedCount,
    autoCreatedCount,
    stagedAttachmentCount,
  });
  return { ok: true };
});
