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
  try {
    const { data: fullEmail, error: fetchError } = await getResend().emails.receiving.get(
      payload.data.email_id,
    );
    if (fetchError) throw new Error(fetchError.message);
    bodyText = fullEmail?.text ?? null;
  } catch (err) {
    logger.error("Failed to fetch full inbound email body", err);
  }

  // A bulk-forwarded thread (player forwards the whole conversation, not
  // just the latest message) yields more than one segment here — one per
  // "On ... wrote:" block — and gets one draft per segment below. Today's
  // normal case (0 or 1 quote markers) always comes back as exactly one
  // segment covering the whole body, so that path is unchanged.
  const segments: { parsed: ParsedForward | null; segmentText: string | null }[] = bodyText
    ? parseForwardedThread(bodyText)
    : [{ parsed: null, segmentText: null }];

  const { data: familyMembers } = await admin
    .from("family_members")
    .select("user_id")
    .eq("family_unit_id", familyUnitId);

  const webhookReceivedAt = payload.data.created_at ?? new Date().toISOString();
  let matchedCount = 0;
  let autoCreatedCount = 0;
  let failedCount = 0;

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

  logger.info("Inbound email draft(s) created", {
    familyUnitId,
    draftCount: segments.length - failedCount,
    failedCount,
    matchedCount,
    autoCreatedCount,
  });
  return { ok: true };
});
