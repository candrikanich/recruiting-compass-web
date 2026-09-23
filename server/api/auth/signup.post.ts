import { defineEventHandler, readBody, createError, getRequestIP } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";
import { verifyTurnstile } from "~/server/utils/turnstile";
import { createVerifiedAccount } from "~/server/utils/accountCreation";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import {
  trimmedEmailSchema,
  strongPasswordSchema,
  sanitizedTextSchema,
  dateSchema,
} from "~/utils/validation/validators";

/**
 * Server-side body schema for this endpoint specifically -- not the same as
 * the client-only signupSchema (utils/validation/schemas.ts), which also
 * requires confirmPassword (never sent to the API) and refines dateOfBirth
 * as required for role=player (this endpoint's manual isUnderMinimumAge
 * check below already covers that, and enforcing it again here would 400 a
 * legitimate role=parent submission with no dateOfBirth at all).
 *
 * role is restricted to parent/player deliberately, not admin -- admin
 * promotion goes through pendingAdmin's metadata.pending_admin flag (which
 * pickAllowedMetadata below already discards) plus a separately-confirmed
 * flow (admin-profile.post.ts's validated adminToken), never a client-
 * asserted role on this public, unauthenticated endpoint.
 */
const signupBodySchema = z.object({
  email: trimmedEmailSchema,
  password: strongPasswordSchema,
  fullName: sanitizedTextSchema(255),
  role: z.enum(["parent", "player"]).optional(),
  // pages/signup.vue sends dateOfBirth as "" by default for role=parent
  // (its ref never becomes undefined) -- allow empty string through
  // alongside a real YYYY-MM-DD date, matching sanitizedTextSchema's
  // pattern above. Downstream code already treats "" as falsy/absent.
  dateOfBirth: dateSchema.or(z.literal("")).optional(),
  captchaToken: z.string().max(4096).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  skipVerificationEmail: z.boolean().optional(),
  inviteToken: z.string().max(255).optional(),
});

type SignupBody = z.infer<typeof signupBodySchema>;

/**
 * A pending, unexpired invite token only proves *an* invite exists — without
 * binding it to the account being created, any caller with the token (it's
 * a URL query param, not a secret) could ride it to skip Turnstile on
 * unrelated or repeated signups. Requiring the submitted email and role to
 * match the invitation's own `invited_email`/`role` closes that gap.
 */
async function hasValidPendingInvite(
  inviteToken: string,
  email: string,
  role: string | undefined,
): Promise<boolean> {
  const supabase = useSupabaseAdmin();
  const { data: invitation } = await supabase
    .from("family_invitations")
    .select("status, expires_at, invited_email, role")
    .eq("token", inviteToken)
    .single();

  if (!invitation || invitation.status !== "pending") return false;
  if (new Date(invitation.expires_at) < new Date()) return false;
  if (invitation.invited_email.trim().toLowerCase() !== email) return false;
  if (!role || invitation.role !== role) return false;
  return true;
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

    const rawBody = await readBody(event);
    const parsed = signupBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Invalid signup data: " + parsed.error.issues[0]?.message,
      });
    }

    const body: SignupBody = parsed.data;
    const email = body.email;
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

    const skipCaptcha = inviteToken
      ? await hasValidPendingInvite(inviteToken, email, role)
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
    return { userId: result.userId, tokenHash: result.tokenHash };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Signup failed", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not create the account. Please try again.",
    });
  }
});
