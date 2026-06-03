/**
 * Stateless unsubscribe token utility.
 *
 * Mirrors the HMAC pattern in `adminToken.ts`. A token authorizes opt-OUT only
 * (idempotent, no opt-in power), so a leaked token can at worst unsubscribe the
 * address it already encodes. Tokens do not expire — unsubscribe links must keep
 * working indefinitely (CAN-SPAM requires ≥30 days).
 */

import { createHmac, timingSafeEqual } from "crypto";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateUnsubscribeToken(email: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`unsubscribe:${normalizeEmail(email)}`)
    .digest("hex");
}

export function verifyUnsubscribeToken(
  email: string,
  token: string,
  secret: string,
): boolean {
  if (!secret || !token || typeof token !== "string") {
    return false;
  }

  const expected = generateUnsubscribeToken(email, secret);
  if (token.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
