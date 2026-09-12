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
 * Standalone signup for a 13-17 player, who names a guardian instead of waiting to be
 * invited by one. See planning/2026-09-11-guardian-linked-signup-spec.md (iOS repo).
 *
 * Exists as a server endpoint for one structural reason: the writes must be ordered.
 * `trg_enforce_minor_requires_invite` is a BEFORE INSERT trigger on public.users that
 * rejects an under-18 player with no guardian link, so the guardian_claims row has to land
 * first — and guardian_claims is service-role only, so the browser cannot write it. Doing
 * this from the client in either order fails.
 *
 * Auth user creation deliberately goes through the ordinary anon-key `signUp` rather than
 * `admin.createUser`, so email confirmation behaves exactly as it does for every other
 * signup instead of forking into a second, separately-maintained path.
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/signup-minor");

  try {
    throwIfRateLimited(
      await rateLimitByIp(event, { requests: 5, window: "10 m" }),
    );

    const body = await readBody<SignupMinorBody>(event);
    const email = body.email?.trim().toLowerCase() ?? "";
    const guardianEmail = body.guardianEmail?.trim().toLowerCase() ?? "";
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
    if (!EMAIL_RE.test(guardianEmail)) {
      throw createError({
        statusCode: 400,
        statusMessage: "A valid parent or guardian email is required",
      });
    }
    // A minor cannot be their own guardian. Without this the whole consent mechanism is
    // self-serve: the player would receive the claim link at their own inbox.
    if (guardianEmail === email) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Your parent or guardian needs a different email address than yours",
      });
    }
    if (isUnderMinimumAge(dateOfBirth)) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Recruiting Compass is not available for players under 13",
      });
    }
    // 18+ belongs on the ordinary signup path; routing an adult through here would attach
    // a guardian claim they neither need nor can clear.
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
        // DO NOT add `date_of_birth` here. It is load-bearing by its absence.
        //
        // handle_new_user() fires on the auth.users insert and immediately creates the
        // public.users row, reading date_of_birth straight out of this metadata. That
        // insert happens BEFORE the guardian_claims row below can exist (the claim's FK
        // needs the auth user), so a DOB present here would make
        // enforce_minor_requires_invite reject the row — and handle_new_user wraps its
        // insert in `EXCEPTION WHEN OTHERS THEN RAISE LOG`, so the rejection is swallowed
        // and the user is left with an auth account and no profile, silently.
        //
        // Omitting it means handle_new_user writes a NULL-DOB row, which the gate passes
        // (it fails open on NULL), and the DOB lands in the upsert further down — by which
        // time the claim exists and the gate is satisfied on UPDATE.
        //
        // Asserted by "omits date_of_birth from signUp metadata" in this route's spec.
        //
        // Otherwise the same `pending_*` carry as pages/signup.vue: player details live in
        // preferences, not on users, and are hydrated across the email-confirmation
        // gap by useAccountProvisioning.applyPendingOnboardingStep1.
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
    const token = randomUUID();

    // Claim before the DOB-bearing upsert: that write is what the gate inspects, and it
    // looks for exactly this row. FK targets auth.users, which the signUp above created.
    // (handle_new_user has already written a NULL-DOB users row by this point — see the
    // metadata note above for why that is safe and why it must stay NULL until now.)
    const { error: claimError } = await supabase
      .from("guardian_claims")
      .insert({
        player_user_id: userId,
        guardian_email: guardianEmail,
        token,
      });

    if (claimError) {
      logger.error("Failed to create guardian claim", claimError);
      throw createError({
        statusCode: 500,
        statusMessage: "Could not start guardian confirmation",
      });
    }

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

    // Non-fatal: the account exists and the claim is live, so a mail failure must not fail
    // the signup. The player can resend from the pending banner, and the reminder cron
    // retries on its own schedule.
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
