import { defineEventHandler, getRouterParam, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import type { PublicProfileData, VideoLink } from "~/types/models";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "public/profile");
  const slug = getRouterParam(event, "slug")!;
  const supabase = createServerSupabaseClient();

  // Resolve by hash_slug first, then vanity_slug
  const { data: profile } = await supabase
    .from("player_profiles")
    .select("*")
    .or(`hash_slug.eq.${slug},vanity_slug.eq.${slug}`)
    .maybeSingle();

  if (!profile) {
    logger.warn("Profile slug not found", { slug });
    throw createError({ statusCode: 404, statusMessage: "Profile not found" });
  }

  if (!profile.is_published) {
    logger.info("Profile is unpublished", { slug });
    throw createError({
      statusCode: 410,
      statusMessage: "This profile is not currently available",
    });
  }

  const { data: user } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", profile.user_id)
    .maybeSingle();

  // Player details live in family_units.pending_player_details (jsonb)
  let details: Record<string, unknown> | null = null;
  if (profile.show_academics || profile.show_athletic || profile.show_film) {
    const { data: familyUnit } = await supabase
      .from("family_units")
      .select("pending_player_details")
      .eq("id", profile.family_unit_id)
      .maybeSingle();
    details = (familyUnit?.pending_player_details as Record<string, unknown>) ?? null;
  }

  let schools: Array<{ id: string; name: string }> | null = null;
  if (profile.show_schools) {
    const { data } = await supabase
      .from("schools")
      .select("id, name")
      .eq("family_unit_id", profile.family_unit_id);
    schools = data ?? null;
  }

  const result: PublicProfileData = {
    playerName: user?.full_name ?? "Athlete",
    bio: profile.bio ?? null,
    academics:
      profile.show_academics && details
        ? {
            gpa: details.gpa as number | undefined,
            sat_score: details.sat_score as number | undefined,
            act_score: details.act_score as number | undefined,
            graduation_year: details.graduation_year as number | undefined,
            high_school: details.high_school as string | undefined,
            core_courses: details.core_courses as string[] | undefined,
          }
        : null,
    athletic:
      profile.show_athletic && details
        ? {
            primary_sport: details.primary_sport as string | undefined,
            primary_position: details.primary_position as string | undefined,
            height_inches: details.height_inches as number | undefined,
            weight_lbs: details.weight_lbs as number | undefined,
          }
        : null,
    film:
      profile.show_film && details?.video_links
        ? (details.video_links as VideoLink[])
        : null,
    schools: profile.show_schools ? (schools ?? []) : null,
  };

  logger.info("Public profile served", { slug });
  return result;
});
