import { defineEventHandler, getRouterParam, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "player/profile/tracking-links");
  try {
    const { id: userId } = await requireAuth(event);
    const coachId = getRouterParam(event, "coachId")!;
    const supabase = useSupabaseAdmin();

    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();

    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) return null;

    const { data: link } = await supabase
      .from("profile_tracking_links")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("coach_id", coachId)
      .maybeSingle();

    logger.debug("Tracking link lookup", { coachId, found: !!link });
    return link ?? null;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to load tracking link", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to load tracking link" });
  }
});
