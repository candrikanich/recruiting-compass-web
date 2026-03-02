import { defineEventHandler, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invitations");
  try {
    const user = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { invitations: [] };
    }

    const { data: invitations, error } = await supabase
      .from("family_invitations")
      .select("id, invited_email, role, status, expires_at, created_at, invited_by")
      .eq("family_unit_id", membership.family_unit_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Failed to fetch invitations", error);
      throw createError({ statusCode: 500, statusMessage: "Failed to fetch invitations" });
    }

    return { invitations: invitations ?? [] };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to list invitations", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to fetch invitations" });
  }
});
