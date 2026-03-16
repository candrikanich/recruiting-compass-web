import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import type { Database } from "~/types/database";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invite/accept");
  try {
    const user = await requireAuth(event);
    const token = getRouterParam(event, "token");

    if (!token) {
      throw createError({ statusCode: 400, statusMessage: "Token is required" });
    }

    const supabase = useSupabaseAdmin();

    const { data: invitation } = await supabase
      .from("family_invitations")
      .select("id, family_unit_id, invited_email, role, status, expires_at")
      .eq("token", token)
      .single();

    if (!invitation) {
      throw createError({ statusCode: 404, statusMessage: "Invitation not found" });
    }

    if (invitation.status !== "pending") {
      throw createError({ statusCode: 409, statusMessage: "Invitation is no longer valid" });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw createError({ statusCode: 410, statusMessage: "This invitation has expired" });
    }

    const emailMismatch =
      user.email?.toLowerCase() !== invitation.invited_email.toLowerCase();

    // Check if already a member (idempotent)
    const { data: existing } = await supabase
      .from("family_members")
      .select("id")
      .eq("family_unit_id", invitation.family_unit_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { error: memberError } = await supabase
        .from("family_members")
        .insert({
          family_unit_id: invitation.family_unit_id,
          user_id: user.id,
          role: invitation.role,
        } as Database["public"]["Tables"]["family_members"]["Insert"]);

      if (memberError) {
        logger.error("Failed to add family member", memberError);
        throw createError({ statusCode: 500, statusMessage: "Failed to join family" });
      }
    }

    await supabase
      .from("family_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    logger.info("Invitation accepted", {
      invitationId: invitation.id,
      userId: user.id,
      emailMismatch,
    });
    return { success: true, familyUnitId: invitation.family_unit_id, emailMismatch };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to accept invitation", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to accept invitation" });
  }
});
