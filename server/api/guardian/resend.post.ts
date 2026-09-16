import { randomUUID } from "node:crypto";
import { defineEventHandler, readBody, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit";
import { sendGuardianClaimEmail } from "~/server/utils/emailService";
import { getSafeRequestOrigin } from "~/server/utils/requestOrigin";
import { resolveGuardianLock } from "~/server/utils/guardianGate";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resend the guardian confirmation email, optionally to a different address.
 *
 * A changed address revokes the old claim and issues a new one, but deliberately carries
 * the original `expires_at` forward: letting the clock restart would make the retention
 * deadline indefinitely extendable by re-entering an address.
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "guardian/resend");

  try {
    const user = await requireAuth(event);
    throwIfRateLimited(
      await rateLimitByUser(event, user.id, { requests: 3, window: "1 h" }),
    );

    const body = await readBody<{ guardianEmail?: string }>(event);
    const supabase = useSupabaseAdmin();

    const { data: userRow } = await supabase
      .from("users")
      .select("role, date_of_birth, guardian_consent_at, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const { data: pendingClaim } = await supabase
      .from("guardian_claims")
      .select("id, guardian_email, token, status, expires_at, reminder_count")
      .eq("player_user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    const requestedEmail = body.guardianEmail?.trim().toLowerCase();

    // A pending row past its expiry is dead weight, not a live claim: the partial unique
    // index only excludes 'pending' rows, so leaving its status alone would collide with
    // a fresh insert below. Mark it expired and fall through to the same "no claim" path
    // a player who never had one takes, instead of 410-ing them into a support dead end.
    let claim = pendingClaim;
    if (claim && new Date(claim.expires_at) < new Date()) {
      await supabase
        .from("guardian_claims")
        .update({ status: "expired" })
        .eq("id", claim.id);
      claim = null;
    }

    if (!claim) {
      // No pending claim — this is the "invite a parent" path for a player who skipped
      // the guardian step at signup (or whose prior claim expired with nothing pending).
      // Same endpoint, same UX action from the player's point of view ("send/resend a
      // confirmation email to my guardian"); only the DB write differs (insert vs.
      // revoke-and-reissue below).
      //
      // Gated on resolveGuardianLock rather than "authenticated at all": without this,
      // any adult, parent, or already-consented player could insert a guardian_claims
      // row and send mail to an arbitrary address, and a second "guardian" accepting for
      // an already-consented player would hit claim/[token]/accept.post.ts's
      // idx_player_one_family unique constraint (500, membership half-written).
      if (!(await resolveGuardianLock(supabase, userRow, user.id))) {
        throw createError({
          statusCode: 403,
          statusMessage: "Your account doesn't have a guardian invite to send",
        });
      }
      if (!requestedEmail) {
        throw createError({
          statusCode: 400,
          statusMessage: "Enter a parent or guardian email to invite them",
        });
      }
      if (!EMAIL_RE.test(requestedEmail)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Enter a valid parent or guardian email",
        });
      }
      if (requestedEmail === user.email?.trim().toLowerCase()) {
        throw createError({
          statusCode: 400,
          statusMessage: "Your parent or guardian needs a different email address than yours",
        });
      }

      const token = randomUUID();
      const { error: insertError } = await supabase.from("guardian_claims").insert({
        player_user_id: user.id,
        guardian_email: requestedEmail,
        token,
      });

      if (insertError) {
        logger.error("Failed to create guardian claim", insertError);
        throw createError({
          statusCode: 500,
          statusMessage: "Could not start guardian confirmation",
        });
      }

      const playerName = userRow?.full_name ?? (user.email ?? "Your athlete").split("@")[0];
      const mail = await sendGuardianClaimEmail({
        to: requestedEmail,
        playerName,
        token,
        requestOrigin: getSafeRequestOrigin(event),
        context: { purpose: "invite", userId: user.id },
      });
      if (!mail.success) {
        logger.warn("Guardian invite email failed to send", mail.error);
        throw createError({
          statusCode: 502,
          statusMessage: "We couldn't send that email. Please try again shortly.",
        });
      }

      logger.info("Guardian claim created from dashboard invite");
      return { success: true };
    }
    let guardianEmail = claim.guardian_email;
    let token = claim.token;

    if (requestedEmail && requestedEmail !== claim.guardian_email) {
      if (!EMAIL_RE.test(requestedEmail)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Enter a valid parent or guardian email",
        });
      }
      if (requestedEmail === user.email?.trim().toLowerCase()) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Your parent or guardian needs a different email address than yours",
        });
      }

      // Revoke then reissue, rather than mutating in place: the old token may already be
      // in an inbox, and it must stop working the moment the address changes.
      await supabase
        .from("guardian_claims")
        .update({ status: "revoked" })
        .eq("id", claim.id);

      token = randomUUID();
      guardianEmail = requestedEmail;

      const { error: insertError } = await supabase
        .from("guardian_claims")
        .insert({
          player_user_id: user.id,
          guardian_email: guardianEmail,
          token,
          expires_at: claim.expires_at,
        });

      if (insertError) {
        logger.error("Failed to reissue guardian claim", insertError);
        throw createError({
          statusCode: 500,
          statusMessage: "Could not update the guardian email",
        });
      }
    } else {
      await supabase
        .from("guardian_claims")
        .update({
          last_reminder_at: new Date().toISOString(),
          reminder_count: (claim.reminder_count ?? 0) + 1,
        })
        .eq("id", claim.id);
    }

    const playerName = userRow?.full_name ?? (user.email ?? "Your athlete").split("@")[0];
    const mail = await sendGuardianClaimEmail({
      to: guardianEmail,
      playerName,
      token,
      requestOrigin: getSafeRequestOrigin(event),
      context: { purpose: "invite", userId: user.id },
    });

    if (!mail.success) {
      logger.warn("Guardian claim resend failed", mail.error);
      throw createError({
        statusCode: 502,
        statusMessage: "We couldn't send that email. Please try again shortly.",
      });
    }

    logger.info("Guardian claim email resent");
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to resend guardian claim", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not resend the confirmation email",
    });
  }
});
