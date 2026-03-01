import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invite/token");
  const token = getRouterParam(event, "token");

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Token is required" });
  }

  const supabase = useSupabaseAdmin();

  try {
    const { data: invitation } = await supabase
      .from("family_invitations")
      .select("id, invited_email, role, status, expires_at, family_unit_id, invited_by")
      .eq("token", token)
      .single();

    if (!invitation) {
      throw createError({ statusCode: 404, statusMessage: "Invitation not found" });
    }

    if (invitation.status !== "pending") {
      throw createError({ statusCode: 409, statusMessage: "This invitation is no longer valid" });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw createError({ statusCode: 410, statusMessage: "This invitation has expired" });
    }

    // Fetch family unit (includes pending_player_details), inviter, and email existence in parallel
    const [{ data: familyUnit }, { data: inviter }, { data: existingUser }] = await Promise.all([
      supabase
        .from("family_units")
        .select("family_name, pending_player_details")
        .eq("id", invitation.family_unit_id)
        .single(),
      supabase.from("users").select("full_name").eq("id", invitation.invited_by).single(),
      supabase.from("users").select("id").eq("email", invitation.invited_email).maybeSingle(),
    ]);

    // Build prefill from parent-entered player details (only for player invitees)
    let prefill: { firstName: string; lastName: string } | undefined;
    const pendingDetails = (familyUnit as any)?.pending_player_details;
    if (invitation.role === "player" && pendingDetails?.playerName) {
      const parts = (pendingDetails.playerName as string).trim().split(/\s+/);
      prefill = {
        firstName: parts[0] ?? "",
        lastName: parts.slice(1).join(" "),
      };
    }

    logger.info("Invitation token lookup", { invitationId: invitation.id });
    return {
      invitationId: invitation.id,
      email: invitation.invited_email,
      role: invitation.role,
      familyName: familyUnit?.family_name ?? "My Family",
      inviterName: inviter?.full_name ?? "A family member",
      emailExists: !!existingUser,
      ...(prefill ? { prefill } : {}),
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to fetch invitation", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to fetch invitation" });
  }
});
