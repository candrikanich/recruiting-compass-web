import { randomUUID } from "node:crypto";
import { defineEventHandler, readBody, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit";
import { sendGuardianClaimEmail } from "~/server/utils/emailService";

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

    const { data: claim } = await supabase
      .from("guardian_claims")
      .select("id, guardian_email, token, status, expires_at, reminder_count")
      .eq("player_user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (!claim) {
      throw createError({
        statusCode: 404,
        statusMessage: "There's no pending confirmation to resend",
      });
    }
    if (new Date(claim.expires_at) < new Date()) {
      throw createError({
        statusCode: 410,
        statusMessage:
          "This confirmation request has expired. Please contact support.",
      });
    }

    const requested = body.guardianEmail?.trim().toLowerCase();
    let guardianEmail = claim.guardian_email;
    let token = claim.token;

    if (requested && requested !== claim.guardian_email) {
      if (!EMAIL_RE.test(requested)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Enter a valid parent or guardian email",
        });
      }
      if (requested === user.email?.trim().toLowerCase()) {
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
      guardianEmail = requested;

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

    const playerName = (user.email ?? "Your athlete").split("@")[0];
    const mail = await sendGuardianClaimEmail({
      to: guardianEmail,
      playerName,
      token,
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
