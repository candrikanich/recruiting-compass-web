import { defineEventHandler, getRouterParam, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import type { PublicProfileData, VideoLink } from "~/types/models";

const HASH_SLUG_RE = /^[a-z0-9]{6}$/;
const VANITY_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/;

/** Social handles from player details; null when every handle is blank. */
function buildSocial(
  details: Record<string, unknown> | null,
): PublicProfileData["social"] {
  if (!details) return null;
  const str = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s.length ? s : undefined;
  };
  const social = {
    twitter_handle: str(details.twitter_handle),
    instagram_handle: str(details.instagram_handle),
    tiktok_handle: str(details.tiktok_handle),
    facebook_url: str(details.facebook_url),
  };
  const hasAny = Object.values(social).some((v) => v !== undefined);
  return hasAny ? social : null;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "public/profile");
  try {
    const slug = getRouterParam(event, "slug")!;

    if (!HASH_SLUG_RE.test(slug) && !VANITY_SLUG_RE.test(slug)) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
    }

    const supabase = createServerSupabaseClient();

    // Resolve by hash_slug first, then vanity_slug
    let profileResult = await supabase
      .from("player_profiles")
      .select("*")
      .eq("hash_slug", slug)
      .maybeSingle();
    if (profileResult.error) {
      logger.error(
        "Failed to query player_profiles by hash_slug",
        profileResult.error,
      );
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to load profile",
      });
    }
    if (!profileResult.data) {
      profileResult = await supabase
        .from("player_profiles")
        .select("*")
        .eq("vanity_slug", slug)
        .maybeSingle();
      if (profileResult.error) {
        logger.error(
          "Failed to query player_profiles by vanity_slug",
          profileResult.error,
        );
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to load profile",
        });
      }
    }
    const profile = profileResult.data;

    if (!profile) {
      logger.warn("Profile slug not found", { slug });
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
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
      .select("full_name, profile_photo_url")
      .eq("id", profile.user_id)
      .maybeSingle();

    // Player details live in user_preferences (category = "player").
    // Film no longer reads this — it's sourced from the video_links table below.
    // Always fetched: academics/athletic are gated, but social is not.
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("data")
      .eq("user_id", profile.user_id)
      .eq("category", "player")
      .maybeSingle();
    const details: Record<string, unknown> | null =
      (prefs?.data as Record<string, unknown>) ?? null;

    let schools: Array<{ id: string; name: string }> | null = null;
    if (profile.show_schools) {
      const { data } = await supabase
        .from("schools")
        .select("id, name")
        .eq("family_unit_id", profile.family_unit_id);
      schools = data ?? null;
    }

    // Service-role client bypasses RLS — explicit ownership filter is the
    // only guard. Scoped to THIS profile's athlete (user_id), never the
    // wider family, so a sibling's videos can never leak onto this page.
    let videoLinks: VideoLink[] | null = null;
    if (profile.show_film) {
      const { data } = await supabase
        .from("video_links")
        .select("platform, url, title")
        .eq("user_id", profile.user_id)
        .order("position", { ascending: true });
      videoLinks = (data ?? []).map((row) => ({
        platform: row.platform,
        url: row.url,
        title: row.title ?? undefined,
      })) as VideoLink[];
    }

    const result: PublicProfileData = {
      playerName: user?.full_name ?? "Athlete",
      photoUrl: user?.profile_photo_url ?? null,
      headerColor: profile.header_color ?? "slate",
      bio: profile.bio ?? null,
      academics:
        profile.show_academics && details
          ? {
              gpa: details.gpa as number | undefined,
              sat_score: details.sat_score as number | undefined,
              act_score: details.act_score as number | undefined,
              graduation_year: details.graduation_year as number | undefined,
              high_school: (details.school_name ?? details.high_school) as
                string | undefined,
              core_courses: details.core_courses as string[] | undefined,
            }
          : null,
      athletic:
        profile.show_athletic && details
          ? {
              primary_sport: details.primary_sport as string | undefined,
              primary_position: details.primary_position as string | undefined,
              positions: details.positions as string[] | undefined,
              height_inches: details.height_inches as number | undefined,
              weight_lbs: details.weight_lbs as number | undefined,
              ncaa_id: (details.ncaa_id as string | undefined) || undefined,
              perfect_game_id:
                (details.perfect_game_id as string | undefined) || undefined,
              prep_baseball_id:
                (details.prep_baseball_id as string | undefined) || undefined,
              prep_baseball_state:
                (details.prep_baseball_state as string | undefined) ||
                undefined,
            }
          : null,
      film: profile.show_film ? videoLinks : null,
      schools: profile.show_schools ? (schools ?? []) : null,
      social: buildSocial(details),
    };

    logger.info("Public profile served", { slug });
    return result;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to load profile", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load profile",
    });
  }
});
