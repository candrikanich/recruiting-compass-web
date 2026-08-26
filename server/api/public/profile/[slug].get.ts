import { defineEventHandler, getRouterParam, createError } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import type {
  PublicProfileData,
  VideoLink,
  ProfileAward,
  CommitmentStatus,
} from "~/types/models";
import {
  resolveSections,
  isSectionVisible,
} from "~/utils/profile/sectionConfig";
import {
  buildPublicMetrics,
  buildTeamHistory,
} from "~/utils/profile/publicProfileBuilders";

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

interface AssemblePublicProfileInput {
  profile: {
    header_color: string;
    bio: string | null;
    banner_url: string | null;
    commitment_status: CommitmentStatus;
    looking_for: string | null;
    values_tags: string[];
    awards: ProfileAward[];
    section_config: unknown;
    show_metrics: boolean;
    show_academics: boolean;
    show_athletic: boolean;
    show_film: boolean;
    show_schools: boolean;
  };
  user: { full_name: string | null; profile_photo_url: string | null } | null;
  details: Record<string, unknown> | null;
  metricsRows: Parameters<typeof buildPublicMetrics>[0];
  videoLinks: VideoLink[] | null;
  schools: Array<{ id: string; name: string }> | null;
  committedSchoolName: string | null;
}

/**
 * Pure assembly of the public profile payload from already-fetched rows.
 * Every field is populated via an explicit allowlist — never spread raw
 * `details` (player_preferences) or `user` rows, which carry private
 * contact fields (email/phone) this endpoint must never leak.
 */
export function assemblePublicProfile(
  input: AssemblePublicProfileInput,
): PublicProfileData {
  const { profile, user, details, metricsRows, videoLinks, schools } = input;
  const sections = resolveSections(profile);

  return {
    playerName: user?.full_name ?? "Athlete",
    photoUrl: user?.profile_photo_url ?? null,
    headerColor: profile.header_color ?? "slate",
    bio: profile.bio ?? null,
    academics:
      isSectionVisible(sections, "academics") && details
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
            ncsa_id: (details.ncsa_id as string | undefined) || undefined,
            hudl_url: (details.hudl_url as string | undefined) || undefined,
            perfect_game_id:
              (details.perfect_game_id as string | undefined) || undefined,
            prep_baseball_id:
              (details.prep_baseball_id as string | undefined) || undefined,
            prep_baseball_state:
              (details.prep_baseball_state as string | undefined) ||
              undefined,
            athletic_net_id:
              (details.athletic_net_id as string | undefined) || undefined,
            swimcloud_id:
              (details.swimcloud_id as string | undefined) || undefined,
            utr_id: (details.utr_id as string | undefined) || undefined,
            tennis_recruiting_id:
              (details.tennis_recruiting_id as string | undefined) ||
              undefined,
            elite_prospects_id:
              (details.elite_prospects_id as string | undefined) || undefined,
            sportsrecruits_id:
              (details.sportsrecruits_id as string | undefined) || undefined,
            concept2_id:
              (details.concept2_id as string | undefined) || undefined,
            milesplit_url:
              (details.milesplit_url as string | undefined) || undefined,
            on3_url: (details.on3_url as string | undefined) || undefined,
            sports247_url:
              (details.sports247_url as string | undefined) || undefined,
          }
        : null,
    film: isSectionVisible(sections, "film") ? videoLinks : null,
    schools: profile.show_schools ? (schools ?? []) : null,
    social: buildSocial(details),
    bannerUrl: profile.banner_url ?? null,
    jerseyNumber: (details?.jersey_number as number | undefined) ?? null,
    commitmentStatus: profile.commitment_status,
    committedSchoolName: input.committedSchoolName,
    lookingFor: isSectionVisible(sections, "values")
      ? (profile.looking_for ?? null)
      : null,
    valuesTags: isSectionVisible(sections, "values")
      ? (profile.values_tags ?? [])
      : [],
    awards: isSectionVisible(sections, "awards") ? (profile.awards ?? []) : [],
    metrics: isSectionVisible(sections, "metrics")
      ? buildPublicMetrics(metricsRows)
      : null,
    teamHistory: isSectionVisible(sections, "team_history")
      ? buildTeamHistory(details)
      : null,
    sections,
  };
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

    const sections = resolveSections(
      profile as unknown as AssemblePublicProfileInput["profile"],
    );

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
    if (isSectionVisible(sections, "film")) {
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

    let metricsRows: Parameters<typeof buildPublicMetrics>[0] = [];
    if (isSectionVisible(sections, "metrics")) {
      const { data } = await supabase
        .from("performance_metrics")
        .select("metric_type, display_value, value, unit, verified, is_primary")
        .eq("user_id", profile.user_id);
      metricsRows = data ?? [];
    }

    let committedSchoolName: string | null = null;
    if (profile.committed_school_id) {
      const { data } = await supabase
        .from("schools")
        .select("name")
        .eq("id", profile.committed_school_id)
        .maybeSingle();
      committedSchoolName = data?.name ?? null;
    }

    const result = assemblePublicProfile({
      // DB CHECK constraint on commitment_status enforces the CommitmentStatus
      // enum; the generated Row type isn't narrowed to it.
      profile: profile as unknown as AssemblePublicProfileInput["profile"],
      user,
      details,
      metricsRows,
      videoLinks,
      schools,
      committedSchoolName,
    });

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
