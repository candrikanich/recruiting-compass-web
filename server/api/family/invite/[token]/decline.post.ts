import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";

// The status transition goes through decline_family_invitation(), a
// SECURITY DEFINER RPC, not a raw UPDATE -- family_invitations_update's
// RLS only ever authorized the inviter (invited_by = auth.uid()), never
// the invitee. A raw UPDATE under a session-scoped client would match
// zero rows for the invitee and silently no-op instead of erroring. The
// initial SELECT-by-token stays: it's still readable under RLS (the
// widened family_invitations_select policy matches by invited_email),
// so a token that doesn't resolve or belongs to a different email 404s
// the same way it always has.
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invite/decline");
  try {
    await requireAuth(event);
    const token = getRouterParam(event, "token");

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: "Token is required",
      });
    }

    const requestToken = extractRequestToken(event);
    const supabase = createServerSupabaseUserClient(requestToken);

    const { data: invitation } = await supabase
      .from("family_invitations")
      .select("id")
      .eq("token", token)
      .single();

    if (!invitation) {
      throw createError({
        statusCode: 404,
        statusMessage: "Invitation not found",
      });
    }

    const { error } = await supabase.rpc("decline_family_invitation", {
      p_invitation_id: invitation.id,
    });

    if (error) {
      if (error.message === "INVITATION_NOT_FOUND") {
        throw createError({
          statusCode: 404,
          statusMessage: "Invitation not found",
        });
      }
      if (error.message === "INVITATION_NOT_PENDING") {
        throw createError({
          statusCode: 409,
          statusMessage: "Invitation is no longer pending",
        });
      }
      if (error.message === "INVITATION_EXPIRED") {
        throw createError({
          statusCode: 410,
          statusMessage: "This invitation has expired",
        });
      }
      logger.error("Failed to decline invitation", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to decline invitation",
      });
    }

    logger.info("Invitation declined", { invitationId: invitation.id });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to decline invitation", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to decline invitation",
    });
  }
});
