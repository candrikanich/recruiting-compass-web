/**
 * Profile completeness calculation.
 *
 * Canonical weighted formula shared with the iOS app
 * (`PlayerDetails.completenessScore`) — see the iOS repo's
 * `planning/2026-08-09-profile-completeness-canonical-spec.md`.
 *
 * `hasHighlightVideo` and `hasHomeLocation` live outside the player-prefs blob
 * (the `video_links` table and the location store), so callers fetch them and
 * pass them in as `signals` — keeping this function pure and unit-testable.
 */

import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("profileCompletenessCalculation");

// Weight configuration: each field's contribution to total completion.
const WEIGHTS = {
  graduationYear: 0.1, // 10%
  primarySport: 0.1, // 10%
  primaryPosition: 0.1, // 10%
  homeLocation: 0.1, // 10% (zip or coordinates — from the location store)
  gpa: 0.15, // 15%
  testScores: 0.1, // 10% (SAT or ACT, not both)
  highlightVideo: 0.15, // 15% (≥1 row in the video_links table)
  height: 0.05, // 5%
  weight: 0.05, // 5%
  contactInfo: 0.1, // 10% (phone)
} as const;

// Verify weights sum to 1.0 (100%)
const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(TOTAL_WEIGHT - 1) > 0.0001) {
  logger.warn(`Profile completeness weights do not sum to 1.0: ${TOTAL_WEIGHT}`);
}

/**
 * The player-prefs fields that feed completeness. A structural subset of
 * `PlayerDetails` (types/models.ts) so callers can pass their form/blob directly.
 */
export interface ScorableProfile {
  graduation_year?: number | null;
  primary_sport?: string | null;
  primary_position?: string | null;
  gpa?: number | null;
  sat_score?: number | null;
  act_score?: number | null;
  height_inches?: number | null;
  weight_lbs?: number | null;
  phone?: string | null;
}

/**
 * Home location counts as "set" for completeness when a zip is present or a
 * geocoded coordinate pair exists. Canonical rule shared with iOS
 * (`HomeLocation.isSet`).
 */
export const isHomeLocationPresent = (
  home?: {
    zip?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null,
): boolean => {
  if (!home) return false;
  if (typeof home.zip === "string" && home.zip.trim().length > 0) return true;
  return home.latitude != null && home.longitude != null;
};

/** Completeness signals sourced from outside the player-prefs blob. */
export interface ProfileCompletenessSignals {
  /** ≥1 row in the video_links table for this athlete. */
  hasHighlightVideo: boolean;
  /** Home location set: a zip or a geocoded coordinate pair. */
  hasHomeLocation: boolean;
}

const NO_SIGNALS: ProfileCompletenessSignals = {
  hasHighlightVideo: false,
  hasHomeLocation: false,
};

/**
 * Checks if a field value is considered "present".
 *
 * Empty strings, null, undefined, and 0 are considered missing.
 */
const isFieldPresent = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value !== 0;
  return Boolean(value);
};

/**
 * Calculates the percentage of profile completion (0-100).
 *
 * Weights:
 * - Graduation Year: 10%
 * - Primary Sport: 10%
 * - Primary Position: 10%
 * - Home Location (zip or coordinates): 10%
 * - GPA: 15%
 * - Test Scores (SAT or ACT): 10%
 * - Highlight Video: 15%
 * - Height: 5%
 * - Weight: 5%
 * - Contact Info (phone): 10%
 *
 * @param profile - The player-prefs object to evaluate
 * @param signals - Presence of a highlight video and a home location
 * @returns Integer from 0 to 100 representing completion percentage
 */
export const calculateProfileCompleteness = (
  profile: ScorableProfile,
  signals: ProfileCompletenessSignals = NO_SIGNALS,
): number => {
  let score = 0;

  if (isFieldPresent(profile.graduation_year)) score += WEIGHTS.graduationYear;
  if (isFieldPresent(profile.primary_sport)) score += WEIGHTS.primarySport;
  if (isFieldPresent(profile.primary_position)) score += WEIGHTS.primaryPosition;
  if (signals.hasHomeLocation) score += WEIGHTS.homeLocation;
  if (isFieldPresent(profile.gpa)) score += WEIGHTS.gpa;
  if (isFieldPresent(profile.sat_score) || isFieldPresent(profile.act_score)) {
    score += WEIGHTS.testScores;
  }
  if (signals.hasHighlightVideo) score += WEIGHTS.highlightVideo;
  if (isFieldPresent(profile.height_inches)) score += WEIGHTS.height;
  if (isFieldPresent(profile.weight_lbs)) score += WEIGHTS.weight;
  if (isFieldPresent(profile.phone)) score += WEIGHTS.contactInfo;

  return Math.round(score * 100);
};
