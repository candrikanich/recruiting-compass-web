import { defineEventHandler, readBody, createError, getRequestIP } from "h3";
import { useLogger } from "~/server/utils/logger";
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";
import { verifyTurnstile } from "~/server/utils/turnstile";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { issueVerificationToken } from "~/server/utils/emailVerificationTokens";
import { sendVerificationEmail } from "~/server/utils/emailService";

interface SignupBody {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
  dateOfBirth?: string;
  captchaToken?: string;
  metadata?: Record<string, string | boolean>;
}

/**
 * Server-side account creation for the decoupled email-verification flow.
 * Accounts are auto-confirmed (email_confirm: true) — verification is now a
 * separate, resendable step (issueVerificationToken + sendVerificationEmail)
 * rather than gating login the way Supabase's own confirmation email does.
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
    const { password, fullName, role, dateOfBirth, captchaToken, metadata } =
      body;

    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: "Email and password are required",
      });
    }

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
      });
    }

    const userMetadata: Record<string, string | boolean> = {
      ...(metadata ?? {}),
      ...(fullName ? { full_name: fullName } : {}),
      ...(role ? { role } : {}),
      ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
    };

    const supabase = useSupabaseAdmin();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (error || !data.user) {
      logger.error("Signup failed", error);
      const statusCode =
        error?.message?.toLowerCase().includes("already registered") ||
        error?.message?.toLowerCase().includes("already been registered")
          ? 409
          : 400;
      throw createError({
        statusCode,
        statusMessage:
          statusCode === 409
            ? "An account with this email already exists"
            : "Unable to create account. Please try again.",
      });
    }

    const { token } = await issueVerificationToken(data.user.id);
    const emailResult = await sendVerificationEmail({ to: email, token });
    if (!emailResult.success) {
      // Non-fatal — the account exists and is usable; the dashboard resend
      // button covers this. Log for visibility only.
      logger.error("Verification email failed to send", emailResult.error);
    }

    logger.info("Signup succeeded", { userId: data.user.id });
    return { userId: data.user.id };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Signup failed", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not create the account. Please try again.",
    });
  }
});
