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
 *   6. Inserts a `pending` draft — Phase 2 builds the confirm/discard UI.
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
import {
  parseInboundToken,
  resolveFamilyByInboundToken,
} from "~/server/utils/familyInboundToken";
import { parseForwardedEmail } from "~/server/utils/parseForwardedEmail";
import { matchCoachByEmail } from "~/server/utils/matchCoachByEmail";
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

type RawEmailInsert =
  Database["public"]["Tables"]["raw_inbound_emails"]["Insert"];
type DraftInsert =
  Database["public"]["Tables"]["inbound_email_drafts"]["Insert"];

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "webhooks/inbound-email");

  let payload: unknown;
  try {
    const rawBody = (await readRawBody(event)) ?? "";
    const headers = getHeaders(event);
    payload = verifyResendWebhook(rawBody, headers);
  } catch (err) {
    logger.warn("Rejected inbound email webhook: bad signature", err);
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid webhook signature",
    });
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
  const familyUnitId = token
    ? await resolveFamilyByInboundToken(admin, token)
    : null;

  if (!familyUnitId) {
    logger.warn("Inbound email addressed to unknown/malformed token", {
      toAddress,
    });
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
    const { data: fullEmail, error: fetchError } =
      await getResend().emails.receiving.get(payload.data.email_id);
    if (fetchError) throw new Error(fetchError.message);
    bodyText = fullEmail?.text ?? null;
  } catch (err) {
    logger.error("Failed to fetch full inbound email body", err);
  }

  const parsed = bodyText ? parseForwardedEmail(bodyText) : null;
  const { coachId, schoolId } = await matchCoachByEmail(admin, {
    familyUnitId,
    email: parsed?.senderEmail,
  });

  const draftInsert: DraftInsert = {
    family_unit_id: familyUnitId,
    raw_email_id: rawRow?.id ?? null,
    matched_coach_id: coachId,
    matched_school_id: schoolId,
    sender_name: parsed?.senderName ?? null,
    sender_email: parsed?.senderEmail ?? null,
    subject: payload.data.subject ?? null,
    body_text: bodyText,
    occurred_at: payload.data.created_at ?? new Date().toISOString(),
    status: "pending",
  };

  const { data: newDraft, error: draftError } = await admin
    .from("inbound_email_drafts")
    .insert(draftInsert)
    .select("id")
    .single();
  if (draftError) {
    logger.error("Failed to create inbound email draft", draftError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to store draft",
    });
  }

  const { data: familyMembers } = await admin
    .from("family_members")
    .select("user_id")
    .eq("family_unit_id", familyUnitId);
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

  logger.info("Inbound email draft created", {
    familyUnitId,
    matched: !!coachId,
  });
  return { ok: true };
});
