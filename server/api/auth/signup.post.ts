import { defineEventHandler, readBody, createError, getRequestIP } from "h3";
import { useLogger } from "~/server/utils/logger";
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";
import { verifyTurnstile } from "~/server/utils/turnstile";
import { createVerifiedAccount } from "~/server/utils/accountCreation";
import { useSupabaseAdmin } from "~/server/utils/supabase";

interface SignupBody {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
  dateOfBirth?: string;
  captchaToken?: string;
  metadata?: Record<string, string | boolean>;
  /**
   * Invite / guardian-claim / admin signups have their `email_verified_at`
   * stamped by the accept handler moments later, so they must never see the
   * verify-email flow at all — including the email (spec §5).
   */
  skipVerificationEmail?: boolean;
  /**
   * Present only when this signup completes a family invite acceptance.
   * A real, unexpired, pending invite row (not a client-asserted flag) is
   * what lets us skip Turnstile here — the invite link itself is already
   * the bot-filter for this path.
   */
  inviteToken?: string;
}

async function hasValidPendingInvite(inviteToken: string): Promise<boolean> {
  const supabase = useSupabaseAdmin();
  const { data: invitation } = await supabase
    .from("family_invitations")
    .select("status, expires_at")
    .eq("token", inviteToken)
    .single();

  if (!invitation || invitation.status !== "pending") return false;
  return new Date(invitation.expires_at) >= new Date();
}

/**
 * Harmless pending-onboarding/invite fields the client is allowed to seed
 * into user_metadata at signup — never privileged flags like `pending_admin`.
 * `admin-profile.post.ts` never trusts unverified metadata for admin
 * promotion (always requires a freshly validated adminToken), so this
 * endpoint must never let a caller write metadata that pretends otherwise.
 */
const ALLOWED_METADATA_KEYS = new Set([
  "pending_primary_sport",
  "pending_graduation_year",
  "pending_gender",
  "pending_zip_code",
  "pending_invite_token",
]);

function pickAllowedMetadata(
  metadata: Record<string, string | boolean> | undefined,
): Record<string, string> {
  const allowed: Record<string, string> = {};
  if (!metadata) return allowed;
  for (const [key, value] of Object.entries(metadata)) {
    if (ALLOWED_METADATA_KEYS.has(key) && typeof value === "string") {
      allowed[key] = value;
    }
  }
  return allowed;
}

/**
 * Server-side account creation for the adult signup path. Account creation
 * and email verification themselves live in createVerifiedAccount()
 * (server/utils/accountCreation.ts), shared with the 13-17 minor path
 * (signup-minor.post.ts) — this endpoint's own job is just this form's
 * Turnstile check and adult-specific metadata shaping.
 *
 * The signup form's Turnstile widget today gets verified natively by
 * Supabase's own signUp() call. Moving account creation server-side means
 * this endpoint owns that check instead — the widget renders with no
 * explicit `action`, so none is expected here either.
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/signup");

  try {
    throwIfRateLimited(
      await rateLimitByIp(event, { requests: 10, window: "1 h" }),
    );

    const body = await readBody<SignupBody>(event);
    const email = body.email?.trim().toLowerCase();
    const {
      password,
      fullName,
      role,
      dateOfBirth,
      captchaToken,
      metadata,
      skipVerificationEmail,
      inviteToken,
    } = body;

    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: "Email and password are required",
      });
    }

    const skipCaptcha = inviteToken
      ? await hasValidPendingInvite(inviteToken)
      : false;

    if (!skipCaptcha) {
      // No explicit `expectedAction` — the signup form's Turnstile widget
      // renders with no action configured, so none is expected here either.
      const turnstileResult = await verifyTurnstile(captchaToken, {
        ip: getRequestIP(event, { xForwardedFor: true }),
        expectedAction: undefined,
      });
      if (!turnstileResult.ok) {
        logger.warn("Signup blocked: Turnstile verification failed", {
          reason: turnstileResult.reason,
        });
        throw createError({
          statusCode: 403,
          statusMessage: "Verification failed. Please try again.",
          data: { code: "captcha_failed" },
        });
      }
    }

    const userMetadata: Record<string, string | boolean> = {
      ...pickAllowedMetadata(metadata),
      ...(fullName ? { full_name: fullName } : {}),
      ...(role ? { role } : {}),
      ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
    };

    const result = await createVerifiedAccount(event, {
      email,
      password,
      userMetadata,
      skipVerificationEmail,
    });

    if (!result.ok) {
      throw createError({
        statusCode: result.statusCode,
        statusMessage: result.statusMessage,
      });
    }

    logger.info("Signup succeeded", { userId: result.userId });
    return { userId: result.userId };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Signup failed", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not create the account. Please try again.",
    });
  }
});
