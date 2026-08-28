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

export interface AssemblePublicProfileInput {
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
    updated_at?: string | null;
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
            intended_major:
              (details.intended_major as string | undefined) || undefined,
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
              (details.prep_baseball_state as string | undefined) || undefined,
            athletic_net_id:
              (details.athletic_net_id as string | undefined) || undefined,
            swimcloud_id:
              (details.swimcloud_id as string | undefined) || undefined,
            utr_id: (details.utr_id as string | undefined) || undefined,
            tennis_recruiting_id:
              (details.tennis_recruiting_id as string | undefined) || undefined,
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
    updatedAt: profile.updated_at ?? null,
    sections,
  };
}
