import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invite/token");
  const token = getRouterParam(event, "token");

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Token is required" });
  }

  // Use service role (admin) to bypass RLS — this is a public endpoint
  const supabase = useSupabaseAdmin();

  const { data: invitation } = await supabase
    .from("family_invitations")
    .select("id, invited_email, role, status, expires_at, family_unit_id, invited_by")
    .eq("token", token)
    .single();

  if (!invitation) {
    throw createError({ statusCode: 404, statusMessage: "Invitation not found" });
  }

  if (invitation.status === "accepted") {
    throw createError({ statusCode: 409, statusMessage: "This invitation has already been accepted" });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: "This invitation has expired" });
  }

  // Fetch family name and inviter name in parallel
  const [{ data: family }, { data: inviter }] = await Promise.all([
    supabase.from("family_units").select("family_name").eq("id", invitation.family_unit_id).single(),
    supabase.from("users").select("full_name").eq("id", invitation.invited_by).single(),
  ]);

  logger.info("Invitation token lookup", { invitationId: invitation.id });
  return {
    invitationId: invitation.id,
    email: invitation.invited_email,
    role: invitation.role,
    familyName: family?.family_name ?? "My Family",
    inviterName: inviter?.full_name ?? "A family member",
  };
});
