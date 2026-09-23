import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { CURRENT_TERMS_VERSION } from "~/utils/legal";

// Maps the accept_guardian_claim() SQL function's raised error messages to the
// HTTP responses this endpoint previously returned for the same conditions.
const CLAIM_ERROR_RESPONSES: Record<
  string,
  { statusCode: number; statusMessage: string }
> = {
  CLAIM_NOT_FOUND: { statusCode: 404, statusMessage: "Link not found" },
  CLAIM_ALREADY_CLAIMED: {
    statusCode: 409,
    statusMessage: "This account has already been confirmed",
  },
  CLAIM_INVALID: {
    statusCode: 410,
    statusMessage: "This link is no longer valid",
  },
  CLAIM_EXPIRED: { statusCode: 410, statusMessage: "This link has expired" },
};

/**
 * A parent/guardian confirms a 13-17 player's self-started account.
 *
 * The mirror of family/invite/[token]/accept: there the guardian invited the player and
 * the player accepts; here the player asked and the guardian accepts. Both converge on the
 * same end state — a family unit containing both, and guardian_consent_* stamped on the
 * minor recording who consented and to which Terms version.
 *
 * Requires an authenticated guardian: consent has to be attributable to a real account,
 * not to whoever opened the link.
 *
 * The claim lookup, family membership, and consent stamp all happen inside a single
 * `accept_guardian_claim()` Postgres function (one RPC call = one transaction), so a
 * failure partway through cannot leave the player in a family without guardian_consent_at
 * recorded — a state guardianGate.ts's hasParentInFamily() would otherwise read as an
 * already-present guardian and silently unlock the account with no consent on file.
 *
 * #912: session-scoped client, not service-role — accept_guardian_claim() itself now
 * verifies p_guardian_id = auth.uid() internally (20260929000040), so a direct RPC call
 * can no longer forge a different guardian id even though EXECUTE is granted to
 * authenticated. The email match is checked inside the function against auth.email()
 * (the verified JWT claim), not a client-supplied p_guardian_email — a prior version of
 * this migration took that as a parameter, which let any signed-in token holder pass the
 * claim's real guardian_email (readable via the token-preview RPC) instead of their own
 * account's email (review finding on PR #979).
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "guardian/claim/accept");

  try {
    const guardian = await requireAuth(event);
    const token = getRouterParam(event, "token");
    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: "Token is required",
      });
    }
    if (!guardian.email) {
      throw createError({
        statusCode: 400,
        statusMessage: "Account has no email on file",
      });
    }

    const requestToken = extractRequestToken(event);
    const supabase = createServerSupabaseUserClient(requestToken);
    const { data: familyUnitId, error } = await supabase.rpc(
      "accept_guardian_claim",
      {
        p_token: token,
        p_guardian_id: guardian.id,
        p_terms_version: CURRENT_TERMS_VERSION,
      },
    );

    if (error) {
      const mapped = CLAIM_ERROR_RESPONSES[error.message];
      if (mapped) throw createError(mapped);

      if (error.message === "CLAIM_EMAIL_MISMATCH") {
        logger.warn("Guardian claim attempted by a non-matching account");
        throw createError({
          statusCode: 403,
          statusMessage:
            "This link was sent to a different email. Sign in with that email to confirm.",
        });
      }

      logger.error("Failed to accept guardian claim", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Could not confirm this account",
      });
    }

    logger.info("Guardian claim accepted", { familyUnitId });
    return { success: true, familyUnitId };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to accept guardian claim", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not confirm this account",
    });
  }
});
