import { randomUUID } from "node:crypto";
import { defineEventHandler, readBody, createError, getRequestIP } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";
import { verifyTurnstile } from "~/server/utils/turnstile";
import { createVerifiedAccount } from "~/server/utils/accountCreation";
import { sendGuardianClaimEmail } from "~/server/utils/emailService";
import { isUnderMinimumAge, requiresGuardianInvite } from "~/utils/age";
import type { Database } from "~/types/database";

interface SignupMinorBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  guardianEmail?: string;
  graduationYear?: number;
  primarySport?: string;
  gender?: string;
  zipCode?: string;
  captchaToken?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Standalone signup for a 13-17 player. Naming a guardian is optional — see
 * docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md. A
 * player who skips can invite one later from the dashboard (POST /api/guardian/resend,
 * extended to create a claim where none exists).
 *
 * Exists as a server endpoint for one reason that survives the guardian-optional
 * change: guardian_claims is service-role-only (a minor must never be able to read
 * their own guardian's confirmation token — see 20260926000000_guardian_claims.sql),
 * so the browser cannot write it directly.
 *
 * date_of_birth rides in the account's metadata (not just the users upsert below), so
 * handle_new_user() writes it atomically as part of the initial row creation — see
 * 20260910200619_handle_new_user_date_of_birth.sql. Without this, a null-DOB row could
 * briefly exist between account creation succeeding and the upsert running, and
 * requiresGuardianInvite(null) is false — a player row with no DOB reads as
 * unlocked. The upsert below still runs (it also carries graduation_year/zip_code,
 * which the trigger doesn't know about), but the lock-relevant field is no longer
 * gated on it succeeding.
 *
 * Account creation and its own email verification go through the same
 * createVerifiedAccount() the adult path uses (server/utils/accountCreation.ts) —
 * a 13-17 player's own email gets verified exactly like an adult's, independent of
 * and parallel to the guardian-claim confirmation below. Guardian consent (access
 * gating — can this player message coaches, share their profile) and email
 * ownership (security — is this address real and reachable) are separate concerns;
 * the guardian confirming their own inbox proves nothing about the player's.
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/signup-minor");

  try {
    throwIfRateLimited(
      await rateLimitByIp(event, { requests: 5, window: "10 m" }),
    );

    const body = await readBody<SignupMinorBody>(event);
    const email = body.email?.trim().toLowerCase() ?? "";
    const guardianEmail = body.guardianEmail?.trim().toLowerCase() || null;
    const firstName = body.firstName?.trim() ?? "";
    const lastName = body.lastName?.trim() ?? "";
    const dateOfBirth = body.dateOfBirth?.trim() ?? "";

    if (!EMAIL_RE.test(email) || !body.password) {
      throw createError({
        statusCode: 400,
        statusMessage: "A valid email and password are required",
      });
    }
    if (!firstName || !lastName) {
      throw createError({
        statusCode: 400,
        statusMessage: "First and last name are required",
      });
    }
    if (guardianEmail) {
      if (!EMAIL_RE.test(guardianEmail)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Enter a valid parent or guardian email",
        });
      }
      // A minor cannot be their own guardian. Without this the whole consent
      // mechanism is self-serve: the player would receive the claim link at their
      // own inbox.
      if (guardianEmail === email) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Your parent or guardian needs a different email address than yours",
        });
      }
    }
    if (isUnderMinimumAge(dateOfBirth)) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Recruiting Compass is not available for players under 13",
      });
    }
    // 18+ belongs on the ordinary signup path; routing an adult through here would
    // pointlessly involve a guardian on an account that doesn't need one.
    if (!requiresGuardianInvite(dateOfBirth)) {
      throw createError({
        statusCode: 400,
        statusMessage: "This route is only for players aged 13-17",
      });
    }

    // No explicit `expectedAction` — the signup form's Turnstile widget
    // renders with no action configured, so none is expected here either.
    const turnstileResult = await verifyTurnstile(body.captchaToken, {
      ip: getRequestIP(event, { xForwardedFor: true }),
      expectedAction: undefined,
    });
    if (!turnstileResult.ok) {
      logger.warn("Minor signup blocked: Turnstile verification failed", {
        reason: turnstileResult.reason,
      });
      throw createError({
        statusCode: 403,
        statusMessage: "Verification failed. Please try again.",
        data: { code: "captcha_failed" },
      });
    }

    const fullName = `${firstName} ${lastName}`;
    const accountResult = await createVerifiedAccount(event, {
      email,
      password: body.password,
      userMetadata: {
        full_name: fullName,
        role: "player",
        date_of_birth: dateOfBirth,
        ...(body.graduationYear
          ? { pending_graduation_year: String(body.graduationYear) }
          : {}),
        ...(body.primarySport
          ? { pending_primary_sport: body.primarySport }
          : {}),
        ...(body.gender ? { pending_gender: body.gender } : {}),
        ...(body.zipCode ? { pending_zip_code: body.zipCode } : {}),
      },
    });

    if (!accountResult.ok) {
      throw createError({
        statusCode: accountResult.statusCode,
        statusMessage: accountResult.statusMessage,
      });
    }

    const userId = accountResult.userId;
    const supabase = useSupabaseAdmin();

    // handle_new_user() has already created the public.users row from the account
    // metadata above (same trigger the adult path relies on). Upsert here to add the
    // fields that trigger doesn't know about (date_of_birth, graduation_year,
    // zip_code as real columns rather than pending_* metadata) — same idempotent
    // upsert pattern pages/signup.vue uses for the adult path.
    const userRecord: Database["public"]["Tables"]["users"]["Insert"] = {
      id: userId,
      email,
      full_name: fullName,
      role: "player",
      date_of_birth: dateOfBirth,
      ...(body.graduationYear ? { graduation_year: body.graduationYear } : {}),
      ...(body.zipCode ? { zip_code: body.zipCode } : {}),
    };

    const { error: userError } = await supabase
      .from("users")
      .upsert(userRecord, { onConflict: "id" });

    if (userError) {
      logger.error("Failed to create minor user profile", userError);
      throw createError({
        statusCode: 500,
        statusMessage: "Could not create the account. Please try again.",
      });
    }

    const tokenHash = accountResult.tokenHash;

    if (!guardianEmail) {
      logger.info("Minor signup created, no guardian named");
      return {
        ok: true,
        guardianEmail: null,
        guardianEmailSent: false,
        tokenHash,
      };
    }

    const token = randomUUID();
    const { error: claimError } = await supabase
      .from("guardian_claims")
      .insert({
        player_user_id: userId,
        guardian_email: guardianEmail,
        token,
      });

    if (claimError) {
      logger.error("Failed to create guardian claim", claimError);
      // The account itself is already created and valid (guardian-optional as of
      // this migration) — a failed claim write must not fail the whole signup. The
      // player can invite a guardian later from the dashboard.
      return { ok: true, guardianEmail, guardianEmailSent: false, tokenHash };
    }

    // Non-fatal: the account exists, so a mail failure must not fail the signup.
    // The player can resend from the pending banner, and the reminder cron retries
    // on its own schedule.
    const mail = await sendGuardianClaimEmail({
      to: guardianEmail,
      playerName: firstName,
      token,
      context: { purpose: "invite", userId },
    });
    if (!mail.success) {
      logger.warn("Guardian claim email failed to send", mail.error);
    }

    logger.info("Minor signup created, awaiting guardian confirmation");
    return {
      ok: true,
      guardianEmail,
      guardianEmailSent: mail.success,
      tokenHash,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Minor signup failed", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not create the account. Please try again.",
    });
  }
});
