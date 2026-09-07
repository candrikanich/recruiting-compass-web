import { Webhook } from "svix";

/**
 * Verifies a Resend outbound-event webhook's Svix signature and returns the
 * parsed payload. Throws on any failure — missing secret, missing/malformed
 * headers, or a signature that doesn't match — so the caller can reject with
 * 401 before touching the database. Never logs the raw body or secret.
 */
export function verifyResendEventWebhook(
  rawBody: string,
  headers: Record<string, string | undefined>,
): unknown {
  const secret = process.env.RESEND_EVENTS_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Invalid webhook signature");
  }
  try {
    const webhook = new Webhook(secret);
    return webhook.verify(rawBody, {
      "svix-id": headers["svix-id"] ?? "",
      "svix-timestamp": headers["svix-timestamp"] ?? "",
      "svix-signature": headers["svix-signature"] ?? "",
    });
  } catch {
    throw new Error("Invalid webhook signature");
  }
}
