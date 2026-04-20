import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

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

    const supabase = useSupabaseAdmin();

    const { data: invitation } = await supabase
      .from("family_invitations")
      .select("id, status, expires_at")
      .eq("token", token)
      .single();

    if (!invitation) {
      throw createError({
        statusCode: 404,
        statusMessage: "Invitation not found",
      });
    }

    if (invitation.status !== "pending") {
      throw createError({
        statusCode: 409,
        statusMessage: "Invitation is no longer pending",
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw createError({
        statusCode: 410,
        statusMessage: "This invitation has expired",
      });
    }

    const { error } = await supabase
      .from("family_invitations")
      .update({ status: "declined", declined_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (error) {
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
