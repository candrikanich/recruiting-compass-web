/**
 * Status Score Calculation Utility
 * Implements composite scoring based on multiple factors
 */

import type {
  StatusLabel,
  StatusScoreInputs,
  StatusScoreResult,
  Phase,
  Division,
} from "~/types/timeline";

/**
 * Weights for composite status score calculation
 */
export const STATUS_WEIGHTS = {
  taskCompletion: 0.35,
  interactionFrequency: 0.25,
  coachInterest: 0.25,
  academicStanding: 0.15,
};

/**
 * Thresholds for status labels
 */
export const STATUS_THRESHOLDS = {
  onTrack: 75,
  slightlyBehind: 50,
  atRisk: 0,
};

/**
 * Calculate composite status score from multiple inputs (0-100)
 */
export function calculateCompositeScore(
  inputs: Partial<StatusScoreInputs>,
): number {
  // Build normalized scores with bounds checking
  const normalized: StatusScoreInputs = {
    taskCompletionRate: Math.max(
      0,
      Math.min(100, inputs.taskCompletionRate ?? 0),
    ),
    interactionFrequencyScore: Math.max(
      0,
      Math.min(100, inputs.interactionFrequencyScore ?? 0),
    ),
    coachInterestScore: Math.max(
      0,
      Math.min(100, inputs.coachInterestScore ?? 0),
    ),
    academicStandingScore: Math.max(
      0,
      Math.min(100, inputs.academicStandingScore ?? 0),
    ),
  };

  const score =
    normalized.taskCompletionRate * STATUS_WEIGHTS.taskCompletion +
    normalized.interactionFrequencyScore * STATUS_WEIGHTS.interactionFrequency +
    normalized.coachInterestScore * STATUS_WEIGHTS.coachInterest +
    normalized.academicStandingScore * STATUS_WEIGHTS.academicStanding;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Get status label from score
 */
export function getStatusLabel(score: number): StatusLabel {
  if (score >= STATUS_THRESHOLDS.onTrack) {
    return "on_track";
  } else if (score >= STATUS_THRESHOLDS.slightlyBehind) {
    return "slightly_behind";
  } else {
    return "at_risk";
  }
}

/**
 * Get status color from label
 */
export function getStatusColor(label: StatusLabel): "green" | "yellow" | "red" {
  switch (label) {
    case "on_track":
      return "green";
    case "slightly_behind":
      return "yellow";
    case "at_risk":
      return "red";
  }
}

/**
 * Calculate task completion rate for a grade level
 */
export function calculateTaskCompletionRate(
  completedTaskIds: string[],
  requiredTaskIds: string[],
): number {
  if (requiredTaskIds.length === 0) return 0;

  const completed = requiredTaskIds.filter((taskId) =>
    completedTaskIds.includes(taskId),
  ).length;
  return (completed / requiredTaskIds.length) * 100;
}

/**
 * Calculate interaction frequency score (0-100)
 * Based on recency and consistency of coach communications
 */
export function calculateInteractionFrequencyScore(
  lastInteractionDate: string | null,
  daysSinceLastInteraction: number,
  targetSchools: number,
): number {
  if (!lastInteractionDate || targetSchools === 0) {
    return 0;
  }

  // Score calculation:
  // Recent (< 7 days): 100
  // Good (7-14 days): 80
  // Fair (14-21 days): 60
  // Poor (21-30 days): 40
  // Very poor (> 30 days): 0

  if (daysSinceLastInteraction <= 7) {
    return 100;
  } else if (daysSinceLastInteraction <= 14) {
    return 80;
  } else if (daysSinceLastInteraction <= 21) {
    return 60;
  } else if (daysSinceLastInteraction <= 30) {
    return 40;
  } else {
    return 0;
  }
}

/**
 * Calculate coach interest score (0-100)
 * Aggregated from signals across target schools
 */
export function calculateCoachInterestScore(
  interestLevels: Array<"low" | "medium" | "high">,
  prioritySchoolInterestCount: number = 0,
): number {
  if (interestLevels.length === 0) {
    return 0;
  }

  // Weight different interest levels
  const highInterestCount = interestLevels.filter((l) => l === "high").length;
  const mediumInterestCount = interestLevels.filter(
    (l) => l === "medium",
  ).length;
  const lowInterestCount = interestLevels.filter((l) => l === "low").length;

  // Calculate base score
  const baseScore =
    (highInterestCount * 100 +
      mediumInterestCount * 60 +
      lowInterestCount * 20) /
    interestLevels.length;

  // Bonus for priority school interest
  const priorityBonus = Math.min(10, prioritySchoolInterestCount * 5);

  return Math.min(100, baseScore + priorityBonus);
}

/**
 * Calculate academic standing score (0-100)
 */
export function calculateAcademicStandingScore(
  gpa: number | null,
  testScores: { sat?: number; act?: number } | null,
  eligibilityStatus: "registered" | "pending" | "not_started",
  _targetDivisions: Division[],
): number {
  let score = 0;

  // GPA scoring (0-40 points)
  if (gpa !== null) {
    if (gpa >= 3.5) {
      score += 40;
    } else if (gpa >= 3.0) {
      score += 30;
    } else if (gpa >= 2.5) {
      score += 20;
    } else if (gpa >= 2.0) {
      score += 10;
    } else {
      score += 0;
    }
  }

  // Test score scoring (0-30 points)
  if (testScores) {
    if (testScores.sat) {
      if (testScores.sat >= 1200) {
        score += 30;
      } else if (testScores.sat >= 1000) {
        score += 20;
      } else if (testScores.sat >= 900) {
        score += 10;
      }
    } else if (testScores.act) {
      if (testScores.act >= 28) {
        score += 30;
      } else if (testScores.act >= 24) {
        score += 20;
      } else if (testScores.act >= 20) {
        score += 10;
      }
    }
  }

  // Eligibility status scoring (0-30 points)
  if (eligibilityStatus === "registered") {
    score += 30;
  } else if (eligibilityStatus === "pending") {
    score += 15;
  }

  return Math.min(100, score);
}

/**
 * Calculate full status score result
 */
export function calculateStatusScoreResult(
  inputs: Partial<StatusScoreInputs>,
): StatusScoreResult {
  const score = calculateCompositeScore(inputs);
  const label = getStatusLabel(score);
  const color = getStatusColor(label);

  return {
    score,
    label,
    color,
    breakdown: {
      taskCompletionRate: inputs.taskCompletionRate ?? 0,
      interactionFrequencyScore: inputs.interactionFrequencyScore ?? 0,
      coachInterestScore: inputs.coachInterestScore ?? 0,
      academicStandingScore: inputs.academicStandingScore ?? 0,
    },
  };
}

/**
 * Get advice message based on status
 */
export function getStatusAdvice(label: StatusLabel): string {
  switch (label) {
    case "on_track":
      return "Keep up the momentum! You're doing great with your recruiting efforts.";
    case "slightly_behind":
      return "You're slightly behind. Focus on consistent coach outreach this week.";
    case "at_risk":
      return "You're at risk. We recommend activating your recovery plan immediately.";
  }
}

/**
 * Get next actions based on status and phase
 */
export function getNextActionsForStatus(
  label: StatusLabel,
  phase: Phase,
): string[] {
  const actions: Record<StatusLabel, Record<Phase, string[]>> = {
    on_track: {
      freshman: [
        "Continue your training routine",
        "Document stats and achievements",
      ],
      sophomore: ["Send follow-up emails to coaches", "Attend summer camps"],
      junior: ["Schedule unofficial visits", "Update highlight video"],
      senior: ["Schedule official visits", "Finalize college applications"],
      committed: [
        "Prepare for college transition",
        "Stay in touch with coaching staff",
      ],
    },
    slightly_behind: {
      freshman: [
        "Increase travel ball participation",
        "Take PSAT practice tests",
      ],
      sophomore: [
        "Prioritize highlight video completion",
        "Send intro emails weekly",
      ],
      junior: ["Increase coach contact frequency", "Attend more showcases"],
      senior: ["Follow up with coaches", "Schedule more official visits"],
      committed: [
        "Review scholarship details",
        "Confirm enrollment requirements",
      ],
    },
    at_risk: {
      freshman: [
        "Meet with school counselor",
        "Join travel ball team immediately",
      ],
      sophomore: [
        "Complete highlight video NOW",
        "Send intros to all target schools",
      ],
      junior: ["Activate recovery plan", "Intensive coach outreach"],
      senior: ["Contact all interested coaches", "Attend every possible camp"],
      committed: ["Reach out to coaching staff", "Confirm all details"],
    },
  };

  return actions[label]?.[phase] ?? [];
}
