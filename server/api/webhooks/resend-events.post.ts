/**
 * POST /api/webhooks/resend-events
 *
 * Resend outbound email lifecycle webhook (Spec B2). Every send from
 * emailService.ts eventually reports back here as its status changes:
 * sent → delivered → opened/clicked, or bounced/complained/delivery_delayed.
 * This handler:
 *   1. Verifies the Svix signature before touching the DB.
 *   2. Normalizes the event type (strips the "email." prefix).
 *   3. Inserts one `email_events` row per event.
 *
 * Always returns 200 once past signature verification, even when the
 * payload shape or event type is unrecognized — Resend retries on non-2xx,
 * and an unknown/future event type is not a delivery failure worth retrying.
 */
import { defineEventHandler, readRawBody, getHeaders, createError } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { verifyResendEventWebhook } from "~/server/utils/verifyResendEventWebhook";

const KNOWN_EVENT_TYPES = new Set([
  "sent",
  "delivered",
  "delivery_delayed",
  "bounced",
  "complained",
  "opened",
  "clicked",
  "failed",
]);

const resendEventPayloadSchema = z.object({
  type: z.string(),
  created_at: z.string().optional(),
  data: z.object({
    email_id: z.string(),
    to: z.array(z.string()),
    subject: z.string().optional(),
  }),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "webhooks/resend-events");

  let rawPayload: unknown;
  try {
    const rawBody = (await readRawBody(event)) ?? "";
    const headers = getHeaders(event);
    rawPayload = verifyResendEventWebhook(rawBody, headers);
  } catch (err) {
    logger.warn("Rejected Resend event webhook: bad signature", err);
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid webhook signature",
    });
  }

  const parsed = resendEventPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    logger.warn("Ignoring Resend event webhook with unrecognized shape", {
      type: (rawPayload as { type?: unknown } | null)?.type,
      issue: parsed.error.issues[0]?.message,
    });
    return { ok: true, skipped: "unrecognized-payload" };
  }
  const payload = parsed.data;

  const eventType = payload.type.replace(/^email\./, "");
  if (!KNOWN_EVENT_TYPES.has(eventType)) {
    logger.info("Ignoring unhandled Resend event type", { type: payload.type });
    return { ok: true, skipped: "unhandled-type" };
  }

  // email_events is not yet in the generated Database schema (migration
  // applied live via MCP, types not regenerated) — same untyped-client
  // pattern used by server/utils/adminAudit.ts.
  const admin = useSupabaseAdmin() as unknown as SupabaseClient;
  const { error } = await admin.from("email_events").insert({
    message_id: payload.data.email_id,
    event_type: eventType,
    recipient_email: payload.data.to[0] ?? null,
    subject: payload.data.subject ?? null,
    occurred_at: payload.created_at ?? new Date().toISOString(),
    // Store the full verified payload, not the Zod-narrowed `payload` used
    // for typed access above -- same reasoning as inbound-email.post.ts (#952).
    raw_payload: rawPayload,
  });

  if (error) {
    logger.error("Failed to store email event", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to store event",
    });
  }

  logger.info("Recorded Resend email event", {
    messageId: payload.data.email_id,
    eventType,
  });
  return { ok: true };
});
