/**
 * Cloudflare Turnstile verifier for the public player profile contact-player
 * flow, plus a companion honeypot check. Flag-gated: with no secret key
 * configured, verification is a silent no-op PASS (mirrors the
 * RESEND_API_KEY guard in server/utils/emailService.ts) so the flow works
 * before Turnstile is provisioned.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResponse {
  success: boolean;
}

export interface TurnstileResult {
  ok: boolean;
  reason?: string;
}

/**
 * Verifies a Turnstile response token against Cloudflare's siteverify API.
 * Never throws: network errors and non-2xx responses resolve to a failed
 * result rather than propagating, so callers can treat this as a plain
 * boolean gate.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<TurnstileResult> {
  const secretKey = process.env.NUXT_TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return { ok: true, reason: "disabled" };
  }

  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token ?? "",
    });
    if (ip) {
      body.set("remoteip", ip);
    }

    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      return { ok: false, reason: "verify_failed" };
    }

    const data = (await response.json()) as TurnstileVerifyResponse;
    return { ok: data.success === true };
  } catch {
    return { ok: false, reason: "verify_failed" };
  }
}

/**
 * True only when the honeypot field was filled with a non-empty,
 * non-whitespace string — the signature of an automated submission.
 */
export function isHoneypotTripped(hp: unknown): boolean {
  return typeof hp === "string" && hp.trim().length > 0;
}
