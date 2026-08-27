/**
 * Cloudflare Turnstile verifier for the public player profile contact-player
 * flow, plus a companion honeypot check. Flag-gated: with no secret key
 * configured, verification is a silent no-op PASS (mirrors the
 * RESEND_API_KEY guard in server/utils/emailService.ts) so the flow works
 * before Turnstile is provisioned.
 *
 * Verifies the full siteverify contract, not just `success`: the response
 * `action` must match the caller's `expectedAction` (defends against a
 * token minted for a different widget/flow being replayed here), and when
 * `NUXT_TURNSTILE_HOSTNAMES` is configured, `hostname` must be in that
 * allowlist (defends against a token minted on an attacker-controlled page
 * embedding the same site key). The hostname check is opt-in — unset env
 * means skip it, not fail open on success/action.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

interface TurnstileVerifyResponse {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export interface TurnstileResult {
  ok: boolean;
  reason?: string;
}

function allowedHostnames(): string[] | null {
  const raw = process.env.NUXT_TURNSTILE_HOSTNAMES;
  if (!raw) return null;
  const hosts = raw
    .split(",")
    .map((h) => h.trim())
    .filter((h) => h.length > 0);
  return hosts.length > 0 ? hosts : null;
}

/**
 * Verifies a Turnstile response token against Cloudflare's siteverify API.
 * Never throws: network errors, non-2xx responses, and contract violations
 * (action/hostname mismatch) all resolve to a failed result rather than
 * propagating, so callers can treat this as a plain boolean gate.
 */
export async function verifyTurnstile(
  token: string | undefined,
  opts?: { ip?: string; expectedAction?: string },
): Promise<TurnstileResult> {
  const secretKey = process.env.NUXT_TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return { ok: true, reason: "disabled" };
  }

  if (!token || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: "missing_token" };
  }

  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token,
    });
    if (opts?.ip) {
      body.set("remoteip", opts.ip);
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
    if (data.success !== true) {
      return { ok: false };
    }

    if (opts?.expectedAction && data.action !== opts.expectedAction) {
      return { ok: false, reason: "action_mismatch" };
    }

    const hosts = allowedHostnames();
    if (hosts && (!data.hostname || !hosts.includes(data.hostname))) {
      return { ok: false, reason: "hostname_mismatch" };
    }

    return { ok: true };
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
