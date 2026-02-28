import { defineEventHandler, readBody, createError } from "h3";
import { randomUUID } from "crypto";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { sendInviteEmail } from "~/server/utils/emailService";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invite");
  try {
    const user = await requireAuth(event);
    const body = await readBody(event);
    const { email, role } = body as { email: string; role: string };

    if (!email || !role || !["player", "parent"].includes(role)) {
      throw createError({
        statusCode: 400,
        statusMessage: "email and role (player|parent) are required",
      });
    }

    const supabase = useSupabaseAdmin();

    // Find the inviter's family
    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      throw createError({
        statusCode: 403,
        statusMessage: "You are not a member of any family",
      });
    }

    const familyUnitId = membership.family_unit_id;

    // Check if the invited email is already a member
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from("family_members")
        .select("id")
        .eq("family_unit_id", familyUnitId)
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existingMember) {
        throw createError({
          statusCode: 409,
          statusMessage: "This person is already a member of your family",
        });
      }
    }

    // Get inviter name and family name for the email
    const { data: inviterProfile } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const { data: family } = await supabase
      .from("family_units")
      .select("family_name")
      .eq("id", familyUnitId)
      .single();

    const token = randomUUID();

    const { data: invitation, error } = await supabase
      .from("family_invitations")
      .insert({
        family_unit_id: familyUnitId,
        invited_by: user.id,
        invited_email: email.toLowerCase().trim(),
        role: role as "player" | "parent",
        token,
      })
      .select("id")
      .single();

    if (error) {
      logger.error("Failed to create invitation", error);
      throw createError({ statusCode: 500, statusMessage: "Failed to create invitation" });
    }

    // Send invite email (non-blocking — don't fail if email fails)
    try {
      await sendInviteEmail({
        to: email,
        inviterName: inviterProfile?.full_name ?? "Your family",
        familyName: family?.family_name ?? "My Family",
        role: role as "player" | "parent",
        token,
      });
    } catch (err) {
      logger.warn("Failed to send invite email — invitation created but email not sent", err);
    }

    logger.info("Invitation created", { invitationId: invitation.id, role, familyUnitId });
    return { success: true, invitationId: invitation.id };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to create invitation", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to create invitation" });
  }
});
