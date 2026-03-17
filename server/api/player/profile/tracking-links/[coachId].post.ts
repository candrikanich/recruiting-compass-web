import { defineEventHandler, getRouterParam, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

function generateRefToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => chars[b % chars.length])
    .join("");
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "player/profile/tracking-links");
  try {
    const { id: userId } = await requireAuth(event);
    const coachId = getRouterParam(event, "coachId")!;
    const supabase = useSupabaseAdmin();

    const { data: membership, error: membershipError } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      logger.error("Failed to query family membership", membershipError);
      throw createError({ statusCode: 500, statusMessage: "Failed to create tracking link" });
    }
    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      throw createError({ statusCode: 404, statusMessage: "No profile found — publish one first" });
    }

    const { data: existing } = await supabase
      .from("profile_tracking_links")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("coach_id", coachId)
      .maybeSingle();

    if (existing) {
      logger.debug("Returning existing tracking link", { coachId });
      return existing;
    }

    const { data: created, error } = await supabase
      .from("profile_tracking_links")
      .insert({ profile_id: profile.id, coach_id: coachId, ref_token: generateRefToken() })
      .select()
      .single();

    if (error) {
      // Handle race condition: concurrent request already inserted this (profile_id, coach_id) pair
      if ((error as { code: string }).code === "23505") {
        const { data: raced, error: refetchError } = await supabase
          .from("profile_tracking_links")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("coach_id", coachId)
          .maybeSingle();
        if (refetchError || !raced) {
          logger.error("Failed to re-fetch tracking link after 23505", refetchError ?? error);
          throw createError({ statusCode: 500, statusMessage: "Failed to create tracking link" });
        }
        logger.debug("Returning concurrently-created tracking link", { coachId });
        return raced;
      }
      logger.error("Failed to create tracking link", error);
      throw createError({ statusCode: 500, statusMessage: "Failed to create tracking link" });
    }

    logger.info("Tracking link created", { coachId });
    return created;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to create tracking link", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to create tracking link" });
  }
});
