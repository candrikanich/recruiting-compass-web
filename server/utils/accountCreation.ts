import { useSupabaseAdmin } from "~/server/utils/supabase";
import { issueVerificationToken } from "~/server/utils/emailVerificationTokens";
import { sendVerificationEmail } from "~/server/utils/emailService";
import { useLogger } from "~/server/utils/logger";
import type { H3Event } from "h3";

export interface CreateVerifiedAccountOptions {
  email: string;
  password: string;
  userMetadata: Record<string, string | boolean>;
  /**
   * Invite / guardian-claim / admin signups have their `email_verified_at`
   * stamped by the accept handler moments later, so they must never see the
   * verify-email flow at all — including the email (spec §5).
   */
  skipVerificationEmail?: boolean;
}

export type CreateVerifiedAccountResult =
  | { ok: true; userId: string }
  | { ok: false; statusCode: number; statusMessage: string };

/**
 * Shared account-creation core for every signup path in this app (adult,
 * 13-17 minor). Accounts are auto-confirmed (email_confirm: true) — Supabase
 * never withholds a session — and verification is a separate, resendable
 * background step (issueVerificationToken + sendVerificationEmail) rather
 * than a login gate.
 *
 * Duplicate-email and other creation failures are intentionally
 * indistinguishable to the caller (generic statusMessage, no `data.code`,
 * same 400 either way) — a distinct "account already exists" response is an
 * account-existence-enumeration oracle Supabase's own signUp() deliberately
 * avoids. Turnstile failures are a separate, non-enumerating error handled
 * by each endpoint's own verifyTurnstile call before this runs.
 */
export async function createVerifiedAccount(
  event: H3Event,
  options: CreateVerifiedAccountOptions,
): Promise<CreateVerifiedAccountResult> {
  const logger = useLogger(event, "accountCreation");
  const { email, password, userMetadata, skipVerificationEmail } = options;

  const supabase = useSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error || !data.user) {
    logger.error("Account creation failed", error);
    return {
      ok: false,
      statusCode: 400,
      statusMessage: "Unable to create account. Please try again.",
    };
  }

  if (!skipVerificationEmail) {
    // Auth account creation above is already committed — token issuance and
    // sending are non-fatal from here on. A failure here must not turn into
    // a signup failure response (the account exists and is usable); the
    // dashboard resend button covers both cases. Log for visibility only.
    try {
      const { token } = await issueVerificationToken(data.user.id);
      const emailResult = await sendVerificationEmail({ to: email, token });
      if (!emailResult.success) {
        logger.error("Verification email failed to send", emailResult.error);
      }
    } catch (err) {
      logger.error("Verification token issuance failed", err);
    }
  }

  return { ok: true, userId: data.user.id };
}
