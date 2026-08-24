/**
 * Static option/config data for the player-details settings form. Extracted from
 * composables/usePlayerDetailsForm.ts so the composable holds behavior, not ~110
 * lines of constant tables. Pure data — no reactivity.
 */

import type { PlayerDetails } from "~/types/models";
import type { SocialPlatform } from "~/utils/social";

export const BATS_OPTIONS = [
  { value: "R", label: "Right" },
  { value: "L", label: "Left" },
  { value: "S", label: "Switch" },
] as const;

export const THROWS_OPTIONS = [
  { value: "R", label: "Right" },
  { value: "L", label: "Left" },
] as const;

export const CAMPUS_SIZE_OPTIONS = [
  { value: "small" as const, label: "Small (<5K)" },
  { value: "medium" as const, label: "Mid (5K–25K)" },
  { value: "large" as const, label: "Large (25K+)" },
];

export const GENDER_OPTIONS = [
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
  { value: "other" as const, label: "Other" },
  { value: "prefer_not_to_say" as const, label: "Prefer not to say" },
];

export const COST_SENSITIVITY_OPTIONS = [
  { value: "high" as const, label: "High" },
  { value: "medium" as const, label: "Medium" },
  { value: "low" as const, label: "Low" },
];

/** Handle field → normalizer platform. facebook_url stores a full URL (no platform). */
export const SOCIAL_PLATFORMS: Record<string, SocialPlatform | null> = {
  twitter_handle: "twitter",
  instagram_handle: "instagram",
  tiktok_handle: "tiktok",
  facebook_url: null,
};

export const SOCIAL_INPUTS: {
  key: keyof PlayerDetails;
  label: string;
  prefix?: string;
  placeholder: string;
}[] = [
  { key: "twitter_handle", label: "Twitter / X", prefix: "@", placeholder: "username" },
  { key: "instagram_handle", label: "Instagram", prefix: "@", placeholder: "username" },
  { key: "tiktok_handle", label: "TikTok", prefix: "@", placeholder: "username" },
  { key: "facebook_url", label: "Facebook URL", placeholder: "https://facebook.com/..." },
];

export const GRADE_LEVELS = [
  {
    key: "9",
    label: "9th Grade (Freshman)",
    teamKey: "ninth_grade_team",
    coachKey: "ninth_grade_coach",
  },
  {
    key: "10",
    label: "10th Grade (Sophomore)",
    teamKey: "tenth_grade_team",
    coachKey: "tenth_grade_coach",
  },
  {
    key: "11",
    label: "11th Grade (Junior)",
    teamKey: "eleventh_grade_team",
    coachKey: "eleventh_grade_coach",
  },
  {
    key: "12",
    label: "12th Grade (Senior)",
    teamKey: "twelfth_grade_team",
    coachKey: "twelfth_grade_coach",
  },
] as const;
