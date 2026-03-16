import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invitations/delete");
  try {
    const user = await requireAuth(event);
    const id = getRouterParam(event, "id");

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: "Invitation ID is required" });
    }

    const supabase = useSupabaseAdmin();

    const { error } = await supabase
      .from("family_invitations")
      .delete()
      .eq("id", id)
      .eq("invited_by", user.id); // belt-and-suspenders: RLS also enforces this

    if (error) {
      logger.error("Failed to revoke invitation", error);
      throw createError({ statusCode: 500, statusMessage: "Failed to revoke invitation" });
    }

    logger.info("Invitation revoked", { invitationId: id, userId: user.id });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to revoke invitation", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to revoke invitation" });
  }
});
