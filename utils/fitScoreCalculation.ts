/**
 * School Fit Signal Calculation Utilities
 *
 * Replaces the old 4-dimension composite fit score with two honest, independent signals:
 * - Personal Fit: location, campus size, cost preferences
 * - Academic Fit: SAT/ACT score comparison vs school ranges (from College Scorecard)
 *
 * @deprecated calculateFitScore, calculateAthleticFit, calculateOpportunityFit are
 * stubs kept for backward compat during migration. Remove after all callers updated.
 */

import type {
  PersonalFitAnalysis,
  PersonalFitSignal,
  AcademicFitAnalysis,
  AcademicFitSignal,
  SchoolAcademicInfo,
  AthleteProfileForFit,
  FitSignalStrength,
  TestScoreStrength,
} from "~/types/schoolFit";
import type { FitTier, FitScoreInputs, FitScoreResult } from "~/types/timeline";

// ─── Personal Fit ────────────────────────────────────────────────────────────

/**
 * Calculate personal fit signals from athlete preferences vs school info.
 * Returns transparent per-signal analysis — never a composite score.
 */
export function calculatePersonalFitSignals(
  athlete: AthleteProfileForFit,
  school: SchoolAcademicInfo,
): PersonalFitAnalysis {
  const location = calcLocationSignal(
    athlete.school_state ?? null,
    school.state ?? null,
  );
  const campusSize = calcCampusSizeSignal(
    athlete.campus_size_preference ?? null,
    school.student_size ?? null,
  );
  const cost = calcCostSignal(
    athlete.cost_sensitivity ?? null,
    school.tuition_out_of_state ?? school.tuition_in_state ?? null,
  );

  const availableSignals = [location, campusSize, cost].filter(
    (s) => s.strength !== "unknown",
  ).length;

  return { signals: { location, campusSize, cost }, availableSignals };
}

function calcLocationSignal(
  athleteState: string | null,
  schoolState: string | null,
): PersonalFitSignal {
  if (!athleteState || !schoolState) {
    return {
      label: "Location",
      value: null,
      strength: "unknown",
      explanation: "Add your home state to see location fit.",
    };
  }
  const sameState = athleteState === schoolState;
  return {
    label: "Location",
    value: sameState ? "In-state" : `Out-of-state (${schoolState})`,
    strength: sameState ? "strong" : "stretch",
    explanation: sameState
      ? "In-state tuition typically applies and you may have regional familiarity."
      : "Out-of-state — consider higher tuition costs and distance from home.",
  };
}

function calcCampusSizeSignal(
  preference: "small" | "medium" | "large" | null,
  studentSize: number | null,
): PersonalFitSignal {
  if (!studentSize) {
    return {
      label: "Campus Size",
      value: null,
      strength: "unknown",
      explanation: "Campus size data not available for this school.",
    };
  }

  const sizeLabel =
    studentSize < 5000 ? "Small" : studentSize <= 25000 ? "Medium" : "Large";
  const sizeDisplay = `${sizeLabel} (${studentSize.toLocaleString()} students)`;

  if (!preference) {
    return {
      label: "Campus Size",
      value: sizeDisplay,
      strength: "unknown",
      explanation:
        "Add your campus size preference in your profile to see fit.",
    };
  }

  const matches =
    (preference === "small" && studentSize < 5000) ||
    (preference === "medium" && studentSize >= 5000 && studentSize <= 25000) ||
    (preference === "large" && studentSize > 25000);

  return {
    label: "Campus Size",
    value: sizeDisplay,
    strength: matches ? "strong" : "stretch",
    explanation: matches
      ? `Matches your ${preference} campus preference.`
      : `This is a ${sizeLabel.toLowerCase()} campus; you prefer ${preference}.`,
  };
}

function calcCostSignal(
  sensitivity: "high" | "medium" | "low" | null,
  costOfAttendance: number | null,
): PersonalFitSignal {
  if (!costOfAttendance) {
    return {
      label: "Cost",
      value: null,
      strength: "unknown",
      explanation: "Tuition data not available for this school.",
    };
  }

  const costDisplay = `$${costOfAttendance.toLocaleString()}/yr`;

  if (!sensitivity) {
    return {
      label: "Cost",
      value: costDisplay,
      strength: "unknown",
      explanation: "Add your cost sensitivity in your profile to see fit.",
    };
  }

  let strength: FitSignalStrength;
  let explanation: string;

  if (sensitivity === "high") {
    if (costOfAttendance <= 20000) {
      strength = "strong";
      explanation = "Cost is well within range for your financial situation.";
    } else if (costOfAttendance <= 35000) {
      strength = "good";
      explanation = "Cost is manageable but factor in scholarship potential.";
    } else {
      strength = "stretch";
      explanation =
        "Cost may be a significant challenge — explore all aid options.";
    }
  } else if (sensitivity === "medium") {
    if (costOfAttendance <= 35000) {
      strength = "strong";
      explanation = "Cost is reasonable for your situation.";
    } else if (costOfAttendance <= 55000) {
      strength = "good";
      explanation =
        "Cost is on the higher end — factor in scholarship potential.";
    } else {
      strength = "stretch";
      explanation = "Cost is high — ensure scholarship options are explored.";
    }
  } else {
    strength = "strong";
    explanation = "Cost is not a primary concern in your college search.";
  }

  return { label: "Cost", value: costDisplay, strength, explanation };
}

// ─── Academic Fit ─────────────────────────────────────────────────────────────

/**
 * Calculate academic fit signals from athlete test scores vs school score ranges.
 * Requires College Scorecard data in the school's academic_info.
 */
export function calculateAcademicFitSignals(
  athlete: Pick<AthleteProfileForFit, "sat_score" | "act_score">,
  school: Pick<
    SchoolAcademicInfo,
    "sat_25th" | "sat_75th" | "act_25th" | "act_75th" | "admission_rate"
  >,
): AcademicFitAnalysis {
  const sat = calcTestScoreSignal(
    "SAT",
    athlete.sat_score ?? null,
    school.sat_25th ?? null,
    school.sat_75th ?? null,
  );
  const act = calcTestScoreSignal(
    "ACT",
    athlete.act_score ?? null,
    school.act_25th ?? null,
    school.act_75th ?? null,
  );

  const hasSchoolData = !!(school.sat_25th || school.act_25th);
  const availableSignals = [sat, act].filter(
    (s) => s.strength !== "unknown",
  ).length;

  return {
    signals: { sat, act },
    admissionRate: school.admission_rate ?? null,
    availableSignals,
    hasSchoolData,
  };
}

function calcTestScoreSignal(
  testName: "SAT" | "ACT",
  athleteScore: number | null,
  school25th: number | null,
  school75th: number | null,
): AcademicFitSignal {
  const hasRange = school25th !== null && school75th !== null;
  const range = hasRange ? { low: school25th!, high: school75th! } : null;

  if (!athleteScore || !hasRange) {
    const missingWhat = !athleteScore
      ? `Add your ${testName} score to your profile`
      : `No ${testName} data available for this school`;
    return {
      label: testName,
      athleteValue: athleteScore,
      schoolRange: range,
      strength: "unknown",
      explanation: `${missingWhat}.`,
    };
  }

  let strength: TestScoreStrength;
  let explanation: string;

  if (athleteScore >= school75th!) {
    strength = "above";
    explanation = `Your ${testName} of ${athleteScore} is above their 75th percentile (${school25th}–${school75th}).`;
  } else if (athleteScore >= school25th!) {
    strength = "in-range";
    explanation = `Your ${testName} of ${athleteScore} falls within their typical range (${school25th}–${school75th}).`;
  } else {
    strength = "below";
    explanation = `Your ${testName} of ${athleteScore} is below their 25th percentile (${school25th}–${school75th}).`;
  }

  return {
    label: testName,
    athleteValue: athleteScore,
    schoolRange: range,
    strength,
    explanation,
  };
}

// ─── Deprecated stubs (backward compat — remove after all callers updated) ────

/** @deprecated Use calculatePersonalFitSignals instead */
export function calculateFitScore(
  inputs: Partial<FitScoreInputs>,
): FitScoreResult {
  const score =
    (inputs.athleticFit ?? 0) +
    (inputs.academicFit ?? 0) +
    (inputs.opportunityFit ?? 0) +
    (inputs.personalFit ?? 0);
  return {
    score: Math.round(score),
    tier: getFitTier(score),
    breakdown: {
      athleticFit: inputs.athleticFit ?? 0,
      academicFit: inputs.academicFit ?? 0,
      opportunityFit: inputs.opportunityFit ?? 0,
      personalFit: inputs.personalFit ?? 0,
    },
    missingDimensions: [],
  };
}

/** @deprecated */
export function getFitTier(score: number): FitTier {
  if (score >= 70) return "match";
  if (score >= 50) return "reach";
  return "unlikely";
}

/** @deprecated */
export function getFitTierColor(_tier: FitTier): string {
  return "slate";
}

/** @deprecated — athletic fit is not calculable from available data */

export function calculateAthleticFit(..._args: unknown[]): number {
  return 0;
}

/** @deprecated — opportunity fit is not calculable from available data */

export function calculateOpportunityFit(..._args: unknown[]): number {
  return 0;
}

/** @deprecated — use calculateAcademicFitSignals instead */

export function calculateAcademicFit(..._args: unknown[]): number {
  return 0;
}

/** @deprecated — use calculatePersonalFitSignals instead */

export function calculatePersonalFit(..._args: unknown[]): number {
  return 0;
}

/** @deprecated */

export function getFitScoreRecommendation(..._args: unknown[]): string {
  return "";
}

/** @deprecated — portfolio health removed */

export function calculatePortfolioHealth(..._args: unknown[]): {
  reaches: number;
  matches: number;
  safeties: number;
  unlikelies: number;
  total: number;
  warnings: string[];
  status: "healthy" | "needs_attention" | "at_risk" | "not_started";
} {
  return {
    reaches: 0,
    matches: 0,
    safeties: 0,
    unlikelies: 0,
    total: 0,
    warnings: [],
    status: "not_started",
  };
}

export const FIT_WEIGHTS = {
  athletic: 0,
  academic: 0,
  opportunity: 0,
  personal: 0,
};
export const FIT_THRESHOLDS = { match: 70, reach: 50, unlikely: 0 };
