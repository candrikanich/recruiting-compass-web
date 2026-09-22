import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { createServerSupabaseAnonClient } from "~/server/utils/supabase";

const ERROR_RESPONSES: Record<string, { statusCode: number; statusMessage: string }> = {
  NOT_FOUND: { statusCode: 404, statusMessage: "Invitation not found" },
  INVALID_STATUS: { statusCode: 409, statusMessage: "This invitation is no longer valid" },
  EXPIRED: { statusCode: 410, statusMessage: "This invitation has expired" },
};

// #912: deliberately unauthenticated -- reachable by anyone with the link
// (e.g. a forwarded invite), not just the invitee, before they may even
// have an account. family_invitations_select requires family membership
// or a matching auth.email(), which an anonymous caller has neither of, so
// the lookup goes through get_family_invitation_by_token() (a SECURITY
// DEFINER RPC that resolves by token internally) rather than a raw query
// -- see supabase/migrations/20260929000040_token_lookup_rpcs.sql for why
// a plain RLS policy can't express "found by token" safely.
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invite/token");
  const token = getRouterParam(event, "token");

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Token is required" });
  }

  const supabase = createServerSupabaseAnonClient();

  try {
    const { data, error } = await supabase
      .rpc("get_family_invitation_by_token", { p_token: token })
      .single();

    if (error) {
      logger.error("Failed to fetch invitation", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch invitation",
      });
    }

    if (!data) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch invitation",
      });
    }

    if (data.error_code) {
      const mapped = ERROR_RESPONSES[data.error_code];
      if (mapped) throw createError(mapped);
      logger.error("Unexpected get_family_invitation_by_token error_code", {
        errorCode: data.error_code,
      });
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch invitation",
      });
    }

    logger.info("Invitation token lookup", { invitationId: data.invitation_id });
    return {
      invitationId: data.invitation_id,
      role: data.role,
      familyName: data.family_name,
      invitedEmail: data.invited_email,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to fetch invitation", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch invitation",
    });
  }
});
