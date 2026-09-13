import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { defineEventHandler, readBody, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";
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
 * so the browser cannot write it directly. There is no longer a write-ordering
 * constraint against the DB gate (supabase/migrations/20260927000000_guardian_link_optional.sql
 * removed the trigger this endpoint used to route around), so this is now a single
 * signUp() call with the real DOB in metadata from the start — handle_new_user()
 * creates the full public.users row itself, same as the ordinary adult signup path.
 *
 * Auth user creation deliberately goes through the ordinary anon-key `signUp` rather
 * than `admin.createUser`, so email confirmation behaves exactly as it does for every
 * other signup instead of forking into a second, separately-maintained path.
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

    const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration (URL or anon key)");
    }

    const fullName = `${firstName} ${lastName}`;
    const anon = createClient<Database>(supabaseUrl, supabaseAnonKey);
    const { data: signUpData, error: signUpError } = await anon.auth.signUp({
      email,
      password: body.password,
      options: {
        captchaToken: body.captchaToken,
        data: {
          full_name: fullName,
          role: "player",
          ...(body.graduationYear
            ? { pending_graduation_year: String(body.graduationYear) }
            : {}),
          ...(body.primarySport
            ? { pending_primary_sport: body.primarySport }
            : {}),
          ...(body.gender ? { pending_gender: body.gender } : {}),
          ...(body.zipCode ? { pending_zip_code: body.zipCode } : {}),
        },
      },
    });

    if (signUpError || !signUpData.user) {
      logger.warn("Minor signup rejected at auth layer", signUpError);
      throw createError({
        statusCode: 400,
        statusMessage:
          signUpError?.message.includes("already registered") === true
            ? "An account with this email already exists"
            : "Could not create the account. Please try again.",
      });
    }

    const userId = signUpData.user.id;
    const supabase = useSupabaseAdmin();

    // handle_new_user() has already created the public.users row from the signUp
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

    if (!guardianEmail) {
      logger.info("Minor signup created, no guardian named");
      return { ok: true, guardianEmail: null, guardianEmailSent: false };
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
      return { ok: true, guardianEmail, guardianEmailSent: false };
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
    return { ok: true, guardianEmail, guardianEmailSent: mail.success };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Minor signup failed", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not create the account. Please try again.",
    });
  }
});
