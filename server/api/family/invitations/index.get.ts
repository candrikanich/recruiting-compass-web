import { defineEventHandler, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invitations");
  try {
    const user = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    const { data: memberships, error: membershipError } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", user.id);

    if (membershipError || !memberships?.length) {
      return { invitations: [] };
    }

    const familyIds = memberships.map((m) => m.family_unit_id);

    const { data: invitations, error } = await supabase
      .from("family_invitations")
      .select(
        "id, invited_email, role, status, expires_at, created_at, invited_by",
      )
      .in("family_unit_id", familyIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Failed to fetch invitations", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch invitations",
      });
    }

    return { invitations: invitations ?? [] };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to list invitations", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch invitations",
    });
  }
});
