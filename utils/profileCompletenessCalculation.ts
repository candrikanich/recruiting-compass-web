/**
 * Profile completeness calculation for player onboarding
 *
 * Calculates what percentage of the player profile is complete
 * based on weighted field contributions.
 */

import type { PlayerProfile } from "~/types/onboarding";

// Weight configuration: each field's contribution to total completion
const WEIGHTS = {
  graduationYear: 0.1, // 10%
  primarySport: 0.1, // 10%
  primaryPosition: 0.1, // 10%
  zipCode: 0.1, // 10%
  gpa: 0.15, // 15%
  testScores: 0.1, // 10% (SAT or ACT, not both)
  highlightVideo: 0.15, // 15%
  athleticStats: 0.1, // 10%
  contactInfo: 0.1, // 10%
} as const;

// Verify weights sum to 1.0 (100%)
const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(TOTAL_WEIGHT - 1) > 0.0001) {
  console.warn(
    `Profile completeness weights do not sum to 1.0: ${TOTAL_WEIGHT}`,
  );
}

/**
 * Checks if a field value is considered "present"
 *
 * Empty strings, null, undefined, and 0 are considered missing.
 * Empty arrays are considered missing.
 */
const isFieldPresent = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
};

/**
 * Calculates the percentage of profile completion (0-100).
 *
 * Weights are distributed as follows:
 * - Graduation Year: 10%
 * - Primary Sport: 10%
 * - Primary Position: 10%
 * - Zip Code: 10%
 * - GPA: 15%
 * - Test Scores (SAT or ACT): 10% (requires at least one, not both)
 * - Highlight Video: 15%
 * - Athletic Stats: 10%
 * - Contact Info (phone): 10%
 *
 * Returns an integer (0-100) representing the percentage complete.
 *
 * @param profile - The player profile object to evaluate
 * @returns Integer from 0 to 100 representing completion percentage
 *
 * @example
 * const profile = {
 *   graduation_year: 2028,
 *   primary_sport: "soccer",
 *   primary_position: "forward",
 *   zip_code: "60601",
 *   gpa: 3.8,
 *   sat_score: 1400,
 * };
 * calculateProfileCompleteness(profile); // Returns 65
 */
export const calculateProfileCompleteness = (
  profile: PlayerProfile,
): number => {
  let completionScore = 0;

  // Check each weighted field
  if (isFieldPresent(profile.graduation_year)) {
    completionScore += WEIGHTS.graduationYear;
  }

  if (isFieldPresent(profile.primary_sport)) {
    completionScore += WEIGHTS.primarySport;
  }

  if (isFieldPresent(profile.primary_position)) {
    completionScore += WEIGHTS.primaryPosition;
  }

  if (isFieldPresent(profile.zip_code)) {
    completionScore += WEIGHTS.zipCode;
  }

  if (isFieldPresent(profile.gpa)) {
    completionScore += WEIGHTS.gpa;
  }

  // Test scores: require at least one (SAT or ACT)
  if (isFieldPresent(profile.sat_score) || isFieldPresent(profile.act_score)) {
    completionScore += WEIGHTS.testScores;
  }

  if (isFieldPresent(profile.highlight_video_url)) {
    completionScore += WEIGHTS.highlightVideo;
  }

  if (isFieldPresent(profile.athletic_stats)) {
    completionScore += WEIGHTS.athleticStats;
  }

  if (isFieldPresent(profile.phone)) {
    completionScore += WEIGHTS.contactInfo;
  }

  // Convert to percentage and round to nearest integer
  return Math.round(completionScore * 100);
};
