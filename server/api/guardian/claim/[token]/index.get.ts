import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { createServerSupabaseAnonClient } from "~/server/utils/supabase";

const ERROR_RESPONSES: Record<string, { statusCode: number; statusMessage: string }> = {
  NOT_FOUND: { statusCode: 404, statusMessage: "Link not found" },
  ALREADY_CLAIMED: {
    statusCode: 409,
    statusMessage: "This account has already been confirmed",
  },
  INVALID_STATUS: { statusCode: 410, statusMessage: "This link is no longer valid" },
  EXPIRED: { statusCode: 410, statusMessage: "This link has expired" },
};

/**
 * Resolve a guardian claim for the confirmation page.
 *
 * Unauthenticated by design — the guardian arrives from an email link and may not have an
 * account yet. The token is the bearer credential, so this returns only what the page has
 * to render (who is asking, and whether the claim is still open) and never the player's
 * contact details or anything else about their account.
 *
 * #912: goes through get_guardian_claim_by_token() (a SECURITY DEFINER RPC) rather than a
 * raw query -- guardian_claims has no anon SELECT policy, and the token column is
 * column-REVOKEd from anon/authenticated entirely (20260929000010), so a session-scoped or
 * anon-key client gets nothing back either way.
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "guardian/claim/get");

  try {
    const token = getRouterParam(event, "token");
    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: "Token is required",
      });
    }

    const supabase = createServerSupabaseAnonClient();
    const { data, error } = await supabase
      .rpc("get_guardian_claim_by_token", { p_token: token })
      .single();

    if (error) {
      logger.error("Failed to resolve guardian claim", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Could not load this confirmation link",
      });
    }

    if (!data) {
      throw createError({
        statusCode: 500,
        statusMessage: "Could not load this confirmation link",
      });
    }

    if (data.error_code) {
      const mapped = ERROR_RESPONSES[data.error_code];
      if (mapped) throw createError(mapped);
      logger.error("Unexpected get_guardian_claim_by_token error_code", {
        errorCode: data.error_code,
      });
      throw createError({
        statusCode: 500,
        statusMessage: "Could not load this confirmation link",
      });
    }

    return {
      guardianEmail: data.guardian_email,
      playerName: data.player_name,
      playerDateOfBirth: data.player_date_of_birth,
      playerGraduationYear: data.player_graduation_year,
      expiresAt: data.expires_at,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to resolve guardian claim", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not load this confirmation link",
    });
  }
});
