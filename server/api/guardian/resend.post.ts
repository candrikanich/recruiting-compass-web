import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import {
  createServerSupabaseUserClient,
  useSupabaseAdmin,
} from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { sendGuardianClaimEmail } from "~/server/utils/emailService";
import { getSafeRequestOrigin } from "~/server/utils/requestOrigin";
import { emailSchema } from "~/utils/validation/validators";

// emailSchema validates .email() before its own .trim()/.toLowerCase(), so a
// whitespace-padded address must be trimmed before it reaches the schema
// (see signup-minor.post.ts, which hit the same issue).
const resendBodySchema = z.object({
  guardianEmail: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    emailSchema.or(z.literal("")).optional(),
  ),
});

const ERROR_RESPONSES: Record<
  string,
  { statusCode: number; statusMessage: string }
> = {
  NOT_ELIGIBLE: {
    statusCode: 403,
    statusMessage: "Your account doesn't have a guardian invite to send",
  },
  EMAIL_REQUIRED: {
    statusCode: 400,
    statusMessage: "Enter a parent or guardian email to invite them",
  },
  SAME_EMAIL: {
    statusCode: 400,
    statusMessage:
      "Your parent or guardian needs a different email address than yours",
  },
  RATE_LIMITED: {
    statusCode: 429,
    statusMessage: "Too many attempts. Please try again later.",
  },
  INVALID_EMAIL: {
    statusCode: 400,
    statusMessage: "Enter a valid parent or guardian email",
  },
};

/**
 * Resend the guardian confirmation email, optionally to a different address.
 *
 * #912: session-scoped client. The route's whole state machine (expire stale claim ->
 * create / revoke+reissue / bump reminder) now lives inside resend_guardian_claim(), a
 * SECURITY DEFINER RPC (20260929000050) -- guardian_claims.token is column-REVOKEd from
 * authenticated and the table has no INSERT/UPDATE policy at all, so a session-scoped
 * client can't perform any of these writes directly. The RPC enforces its own durable
 * rate limit and eligibility gate (see that migration's header) rather than trusting this
 * route's checks alone, since it's also reachable directly via PostgREST once EXECUTE is
 * granted to authenticated.
 *
 * The RPC deliberately never returns the claim token -- returning it would let any
 * signed-in caller read it directly via the RPC, bypassing the email-delivery boundary
 * the token-column REVOKE exists to enforce. After the RPC succeeds, this route fetches
 * the token for the returned claim_id with a narrow useSupabaseAdmin() call (service-role,
 * scoped to a single column/row) -- the one piece of this route that genuinely can't move
 * off the privileged client, since the whole point is that only the trusted server, not a
 * direct RPC caller, may read it.
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "guardian/resend");

  try {
    const user = await requireAuth(event);

    const rawBody = await readBody(event);
    const parsed = resendBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Enter a valid parent or guardian email",
      });
    }
    const requestedEmail = parsed.data.guardianEmail || undefined;

    const token = extractRequestToken(event);
    const supabase = createServerSupabaseUserClient(token);
    const { data, error } = await supabase
      .rpc("resend_guardian_claim", {
        p_requested_email: requestedEmail ?? null,
      })
      .single();

    if (error) {
      logger.error("Failed to resend guardian claim", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Could not resend the confirmation email",
      });
    }

    if (!data) {
      throw createError({
        statusCode: 500,
        statusMessage: "Could not resend the confirmation email",
      });
    }

    if (data.error_code) {
      const mapped = ERROR_RESPONSES[data.error_code];
      if (mapped) throw createError(mapped);
      logger.error("Unexpected resend_guardian_claim error_code", {
        errorCode: data.error_code,
      });
      throw createError({
        statusCode: 500,
        statusMessage: "Could not resend the confirmation email",
      });
    }

    // Only the service-role client may read guardian_claims.token (see the
    // doc comment above) -- fetch it narrowly, scoped to the single row the
    // RPC just created/reissued/reminded.
    const admin = useSupabaseAdmin();
    const { data: claimRow, error: claimError } = await admin
      .from("guardian_claims")
      .select("token")
      .eq("id", data.claim_id!)
      .single();

    if (claimError || !claimRow) {
      logger.error("Failed to fetch claim token after resend", claimError);
      throw createError({
        statusCode: 500,
        statusMessage: "Could not resend the confirmation email",
      });
    }

    const mail = await sendGuardianClaimEmail({
      to: data.guardian_email!,
      playerName: data.player_name!,
      token: claimRow.token,
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
