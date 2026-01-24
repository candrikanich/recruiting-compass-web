/**
 * Fit Score Calculation Utility
 * Implements 4-dimension fit score calculation for schools
 */

import type {
  FitTier,
  FitScoreInputs,
  FitScoreResult,
  PortfolioHealth,
} from "~/types/timeline";

/**
 * Weights for 4-dimension fit score calculation
 */
export const FIT_WEIGHTS = {
  athletic: 0.4, // 40 points max
  academic: 0.25, // 25 points max
  opportunity: 0.2, // 20 points max
  personal: 0.15, // 15 points max
};

/**
 * Thresholds for fit tiers
 */
export const FIT_THRESHOLDS = {
  match: 70,
  reach: 50,
  unlikely: 0,
};

/**
 * Calculate total fit score from partial inputs
 * Returns score (0-100), tier, breakdown, and missing dimensions
 */
export function calculateFitScore(
  inputs: Partial<FitScoreInputs>,
): FitScoreResult {
  // Normalize inputs with defaults
  const normalized: FitScoreInputs = {
    athleticFit: inputs.athleticFit ?? 0,
    academicFit: inputs.academicFit ?? 0,
    opportunityFit: inputs.opportunityFit ?? 0,
    personalFit: inputs.personalFit ?? 0,
  };

  // Ensure all dimensions are within their max points
  normalized.athleticFit = Math.max(
    0,
    Math.min(40, normalized.athleticFit ?? 0),
  );
  normalized.academicFit = Math.max(
    0,
    Math.min(25, normalized.academicFit ?? 0),
  );
  normalized.opportunityFit = Math.max(
    0,
    Math.min(20, normalized.opportunityFit ?? 0),
  );
  normalized.personalFit = Math.max(
    0,
    Math.min(15, normalized.personalFit ?? 0),
  );

  // Calculate weighted score (0-100)
  const score =
    normalized.athleticFit +
    normalized.academicFit +
    normalized.opportunityFit +
    normalized.personalFit;

  // Determine tier
  const tier = getFitTier(score);

  // Identify missing dimensions (0 points provided)
  const missingDimensions: string[] = [];
  if (normalized.athleticFit === 0) missingDimensions.push("athletic");
  if (normalized.academicFit === 0) missingDimensions.push("academic");
  if (normalized.opportunityFit === 0) missingDimensions.push("opportunity");
  if (normalized.personalFit === 0) missingDimensions.push("personal");

  return {
    score: Math.round(score),
    tier,
    breakdown: normalized,
    missingDimensions,
  };
}

/**
 * Get fit tier from score (0-100)
 */
export function getFitTier(score: number): FitTier {
  if (score >= FIT_THRESHOLDS.match) {
    return "match";
  } else if (score >= FIT_THRESHOLDS.reach) {
    return "reach";
  } else {
    return "unlikely";
  }
}

/**
 * Get color for fit tier
 */
export function getFitTierColor(tier: FitTier): string {
  switch (tier) {
    case "match":
      return "emerald";
    case "safety":
      return "blue";
    case "reach":
      return "orange";
    case "unlikely":
      return "red";
  }
}

/**
 * Calculate athletic fit dimension (0-40)
 * Based on position match, physical comparison, performance tier, coach interest
 */
export function calculateAthleticFit(
  athletePosition: string | null,
  athleteHeight: number | null,
  athleteWeight: number | null,
  athleteVelo: number | null, // mph for pitchers or exit velo for hitters
  schoolPositionNeeds: string[] = [],
  coachInterestLevel: "low" | "medium" | "high" = "low",
  _rosterDepth: number = 50, // percentage of roster filled at position
): number {
  let score = 0;

  // Position match (0-10)
  if (athletePosition && schoolPositionNeeds.length > 0) {
    if (schoolPositionNeeds.includes(athletePosition)) {
      score += 10;
    } else if (
      schoolPositionNeeds.some(
        (p) => p.includes("OF") && athletePosition.includes("OF"),
      )
    ) {
      score += 7;
    } else if (
      schoolPositionNeeds.some(
        (p) => p.includes("IF") && athletePosition.includes("IF"),
      )
    ) {
      score += 7;
    } else {
      score += 3;
    }
  }

  // Coach interest (0-10)
  switch (coachInterestLevel) {
    case "high":
      score += 10;
      break;
    case "medium":
      score += 6;
      break;
    case "low":
      score += 2;
      break;
  }

  // Physical measurements (0-10)
  if (athleteHeight && athleteWeight) {
    // Basic validation - most college baseball players are 5'9" to 6'4" and 180-220 lbs
    if (
      athleteHeight >= 69 &&
      athleteHeight <= 76 &&
      athleteWeight >= 180 &&
      athleteWeight <= 220
    ) {
      score += 8;
    } else if (
      athleteHeight >= 67 &&
      athleteHeight <= 78 &&
      athleteWeight >= 160 &&
      athleteWeight <= 240
    ) {
      score += 5;
    } else {
      score += 2;
    }
  }

  // Performance level (0-10)
  if (athleteVelo) {
    // Velo benchmarks for pitchers: 85+ mph is college-ready
    if (athleteVelo >= 88) {
      score += 10;
    } else if (athleteVelo >= 85) {
      score += 8;
    } else if (athleteVelo >= 82) {
      score += 5;
    } else {
      score += 2;
    }
  }

  return Math.min(40, score);
}

/**
 * Calculate academic fit dimension (0-25)
 * Based on GPA, test scores, major offered, academic support
 */
export function calculateAcademicFit(
  athleteGpa: number | null,
  athleteSat: number | null,
  athleteAct: number | null,
  schoolAvgGpa: number | null,
  schoolAvgSat: number | null,
  schoolAvgAct: number | null,
  targetMajor: string | null = null,
  schoolOfferedMajors: string[] = [],
): number {
  let score = 0;

  // GPA fit (0-10)
  if (athleteGpa && schoolAvgGpa) {
    const gpaDiff = schoolAvgGpa - athleteGpa;
    if (gpaDiff <= 0.2) {
      score += 10;
    } else if (gpaDiff <= 0.5) {
      score += 8;
    } else if (gpaDiff <= 1.0) {
      score += 5;
    } else {
      score += 2;
    }
  } else if (athleteGpa) {
    // No school data, score based on absolute GPA
    if (athleteGpa >= 3.5) score += 9;
    else if (athleteGpa >= 3.0) score += 7;
    else if (athleteGpa >= 2.5) score += 5;
    else score += 2;
  }

  // Test score fit (0-8)
  if (athleteSat && schoolAvgSat) {
    const satDiff = schoolAvgSat - athleteSat;
    if (satDiff <= 50) {
      score += 8;
    } else if (satDiff <= 150) {
      score += 5;
    } else {
      score += 2;
    }
  } else if (athleteAct && schoolAvgAct) {
    const actDiff = schoolAvgAct - athleteAct;
    if (actDiff <= 2) {
      score += 8;
    } else if (actDiff <= 4) {
      score += 5;
    } else {
      score += 2;
    }
  }

  // Major offered (0-5)
  if (targetMajor && schoolOfferedMajors.length > 0) {
    if (
      schoolOfferedMajors.some((m) =>
        m.toLowerCase().includes(targetMajor.toLowerCase()),
      )
    ) {
      score += 5;
    } else {
      score += 2;
    }
  }

  // Academic support (0-2) - assume all colleges have support
  score += 2;

  return Math.min(25, score);
}

/**
 * Calculate opportunity fit dimension (0-20)
 * Based on roster depth, graduation timeline, scholarship availability, walk-on history
 */
export function calculateOpportunityFit(
  positionRosterDepth: number = 50, // percentage (0-100)
  yearsToGraduate: number = 3, // years until starters graduate
  scholarshipAvailability: "high" | "medium" | "low" = "medium",
  walkOnHistory: boolean = false,
): number {
  let score = 0;

  // Roster depth (0-7) - lower depth = better opportunity
  if (positionRosterDepth <= 60) {
    score += 7;
  } else if (positionRosterDepth <= 75) {
    score += 5;
  } else if (positionRosterDepth <= 90) {
    score += 3;
  } else {
    score += 1;
  }

  // Graduation timeline (0-5) - coaches graduating soon = better opportunity
  if (yearsToGraduate <= 2) {
    score += 5;
  } else if (yearsToGraduate <= 3) {
    score += 4;
  } else if (yearsToGraduate <= 4) {
    score += 2;
  } else {
    score += 1;
  }

  // Scholarship availability (0-4)
  switch (scholarshipAvailability) {
    case "high":
      score += 4;
      break;
    case "medium":
      score += 2;
      break;
    case "low":
      score += 1;
      break;
  }

  // Walk-on history (0-4)
  if (walkOnHistory) {
    score += 3;
  } else {
    score += 1;
  }

  return Math.min(20, score);
}

/**
 * Calculate personal fit dimension (0-15)
 * Based on location, campus size, cost, priority alignment, major strength
 */
export function calculatePersonalFit(
  athleteState: string | null,
  schoolState: string | null,
  athleteCampusSizePreference: "small" | "medium" | "large" = "medium",
  schoolCampusSize: number = 10000, // student population
  athleteCostSensitivity: "high" | "medium" | "low" = "medium",
  schoolCostOfAttendance: number = 30000, // annual cost
  isPrioritySchool: boolean = false,
  majorStrengthRating: number = 5, // 1-10 scale
): number {
  let score = 0;

  // Location preference (0-4)
  if (athleteState && schoolState) {
    if (athleteState === schoolState) {
      score += 4;
    } else {
      score += 1;
    }
  }

  // Campus size fit (0-3)
  const campusSizeScore = getCampusSizeScore(
    athleteCampusSizePreference,
    schoolCampusSize,
  );
  score += campusSizeScore;

  // Cost fit (0-4)
  if (athleteCostSensitivity === "high") {
    if (schoolCostOfAttendance <= 20000) score += 4;
    else if (schoolCostOfAttendance <= 35000) score += 2;
    else score += 0;
  } else if (athleteCostSensitivity === "medium") {
    if (schoolCostOfAttendance <= 30000) score += 3;
    else if (schoolCostOfAttendance <= 45000) score += 2;
    else score += 1;
  } else {
    // Low sensitivity
    score += 4;
  }

  // Priority alignment (0-2)
  if (isPrioritySchool) {
    score += 2;
  } else {
    score += 0;
  }

  // Major strength (0-2)
  if (majorStrengthRating >= 7) {
    score += 2;
  } else if (majorStrengthRating >= 4) {
    score += 1;
  }

  return Math.min(15, score);
}

/**
 * Helper: Score campus size fit
 */
function getCampusSizeScore(
  preference: "small" | "medium" | "large",
  population: number,
): number {
  const smallFit = Math.abs(population - 5000) <= 3000 ? 3 : 1;
  const mediumFit = Math.abs(population - 15000) <= 5000 ? 3 : 1;
  const largeFit = Math.abs(population - 25000) <= 10000 ? 3 : 1;

  switch (preference) {
    case "small":
      return smallFit;
    case "medium":
      return mediumFit;
    case "large":
      return largeFit;
  }
}

/**
 * Calculate portfolio health across all schools
 */
export function calculatePortfolioHealth(
  schools: Array<{ fit_score: number; fit_tier?: FitTier }> = [],
): PortfolioHealth {
  if (schools.length === 0) {
    return {
      reaches: 0,
      matches: 0,
      safeties: 0,
      unlikelies: 0,
      total: 0,
      warnings: [
        "You haven't added any schools yet. Start building your college list!",
      ],
      status: "not_started",
    };
  }

  let reaches = 0;
  let matches = 0;
  let safeties = 0;
  let unlikelies = 0;

  for (const school of schools) {
    const score = school.fit_score || 0;
    const tier = school.fit_tier || getFitTier(score);

    switch (tier) {
      case "reach":
        reaches++;
        break;
      case "match":
        matches++;
        break;
      case "safety":
        safeties++;
        break;
      case "unlikely":
        unlikelies++;
        break;
    }
  }

  const total = schools.length;
  const warnings: string[] = [];
  let status: "healthy" | "needs_attention" | "at_risk" | "not_started" =
    "healthy";

  // Check for portfolio balance
  if (safeties === 0 && total > 0) {
    warnings.push(
      "Add at least 2-3 safety schools to ensure you have options.",
    );
    status = "needs_attention";
  }

  if (matches === 0 && total > 0) {
    warnings.push(
      "Consider adding match schools where you have a realistic chance.",
    );
    status = "needs_attention";
  }

  if (reaches > matches + safeties) {
    warnings.push(
      "You have more reach schools than match and safety combined. Balance your list.",
    );
    status = "needs_attention";
  }

  if (total < 5) {
    warnings.push("Consider adding more schools to diversify your options.");
    status = "needs_attention";
  }

  return {
    reaches,
    matches,
    safeties,
    unlikelies,
    total,
    warnings: warnings.length > 0 ? warnings : [],
    status,
  };
}

/**
 * Get recommendation based on fit score and tier
 */
export function getFitScoreRecommendation(
  score: number,
  tier: FitTier,
): string {
  switch (tier) {
    case "match":
      return "Excellent fit! This school aligns well with your profile.";
    case "safety":
      return "Good fit! You have a strong chance at this school.";
    case "reach":
      return `Possible fit with some growth. Score: ${score}/100. Focus on the missing dimensions.`;
    case "unlikely":
      return `Not a strong fit based on current data. Work on improving key dimensions.`;
  }
}
