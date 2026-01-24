/**
 * Phase Calculation Utility
 * Implements milestone-based phase determination and progression logic
 */

import type { Phase, MilestoneProgress } from "~/types/timeline";

/**
 * Milestone tasks required to advance from one phase to the next
 * These task IDs should match the database seeded tasks
 */
export const PHASE_MILESTONES: Record<string, string[]> = {
  freshmanToSophomore: [
    // Grade 9 required tasks for advancing to sophomore
    "understand-academic-requirements",
    "establish-development-routine",
    "play-travel-ball",
    "research-division-levels",
  ],
  sophomoreToJunior: [
    // Grade 10 required tasks for advancing to junior
    "create-highlight-video",
    "maintain-strong-gpa-10",
    "build-target-school-list-20",
    "send-first-introductory-emails",
  ],
  juniorToSenior: [
    // Grade 11 required tasks for advancing to senior
    "register-with-ncaa-eligibility",
    "peak-athletic-performance-11",
    "increase-coach-communication",
    "film-multiple-game-performances",
  ],
  seniorToCommitted: [
    // Grade 12 required task for advancement
    "sign-nli",
  ],
};

/**
 * Phase information with metadata
 */
export const PHASE_INFO: Record<
  Phase,
  {
    label: string;
    grade: number;
    theme: string;
    description: string;
  }
> = {
  freshman: {
    label: "Freshman Year",
    grade: 9,
    theme: "Foundation & Awareness",
    description:
      "Understand the recruiting process and build athletic foundation",
  },
  sophomore: {
    label: "Sophomore Year",
    grade: 10,
    theme: "Exposure & Communication",
    description: "Get on coaches radar and start building relationships",
  },
  junior: {
    label: "Junior Year",
    grade: 11,
    theme: "Evaluation & Relationship Building",
    description: "Peak performance year - coaches are watching closely",
  },
  senior: {
    label: "Senior Year",
    grade: 12,
    theme: "Commitment & Transition",
    description: "Finalize recruiting and prepare for college",
  },
  committed: {
    label: "Committed",
    grade: 12,
    theme: "Post-Commitment",
    description: "Signed and ready for college baseball",
  },
};

/**
 * Calculate which phase athlete should be in based on milestone completion
 * Returns the highest phase for which all milestones are complete
 */
export function calculatePhase(
  completedTaskIds: string[],
  hasSignedNLI: boolean,
): Phase {
  // Check if NLI signed (highest phase)
  if (hasSignedNLI) {
    return "committed";
  }

  // Check junior to senior transition
  const juniorToSeniorMilestones = PHASE_MILESTONES.juniorToSenior;
  if (
    juniorToSeniorMilestones.every((taskId) =>
      completedTaskIds.includes(taskId),
    )
  ) {
    return "senior";
  }

  // Check sophomore to junior transition
  const sophomoreToJuniorMilestones = PHASE_MILESTONES.sophomoreToJunior;
  if (
    sophomoreToJuniorMilestones.every((taskId) =>
      completedTaskIds.includes(taskId),
    )
  ) {
    return "junior";
  }

  // Check freshman to sophomore transition
  const freshmanToSophomoreMilestones = PHASE_MILESTONES.freshmanToSophomore;
  if (
    freshmanToSophomoreMilestones.every((taskId) =>
      completedTaskIds.includes(taskId),
    )
  ) {
    return "sophomore";
  }

  // Default to freshman if no milestones complete
  return "freshman";
}

/**
 * Get milestone progress for a specific phase
 */
export function getMilestoneProgress(
  phase: Phase,
  completedTaskIds: string[],
): MilestoneProgress {
  let required: string[] = [];

  switch (phase) {
    case "freshman":
      required = PHASE_MILESTONES.freshmanToSophomore;
      break;
    case "sophomore":
      required = PHASE_MILESTONES.sophomoreToJunior;
      break;
    case "junior":
      required = PHASE_MILESTONES.juniorToSenior;
      break;
    case "senior":
      required = PHASE_MILESTONES.seniorToCommitted;
      break;
    case "committed":
      return {
        phase: "committed",
        required: [],
        completed: [],
        remaining: [],
        percentComplete: 100,
      };
  }

  const completed = required.filter((taskId) =>
    completedTaskIds.includes(taskId),
  );
  const remaining = required.filter(
    (taskId) => !completedTaskIds.includes(taskId),
  );
  const percentComplete =
    required.length > 0 ? (completed.length / required.length) * 100 : 0;

  return {
    phase,
    required,
    completed,
    remaining,
    percentComplete,
  };
}

/**
 * Check if athlete can advance to next phase
 */
export function canAdvancePhase(
  currentPhase: Phase,
  completedTaskIds: string[],
): boolean {
  switch (currentPhase) {
    case "freshman": {
      const milestones = PHASE_MILESTONES.freshmanToSophomore;
      return milestones.every((taskId) => completedTaskIds.includes(taskId));
    }
    case "sophomore": {
      const milestones = PHASE_MILESTONES.sophomoreToJunior;
      return milestones.every((taskId) => completedTaskIds.includes(taskId));
    }
    case "junior": {
      const milestones = PHASE_MILESTONES.juniorToSenior;
      return milestones.every((taskId) => completedTaskIds.includes(taskId));
    }
    case "senior": {
      const milestones = PHASE_MILESTONES.seniorToCommitted;
      return milestones.every((taskId) => completedTaskIds.includes(taskId));
    }
    case "committed":
      return false;
  }
}

/**
 * Get the next phase
 */
export function getNextPhase(currentPhase: Phase): Phase | null {
  const phaseSequence: Phase[] = [
    "freshman",
    "sophomore",
    "junior",
    "senior",
    "committed",
  ];
  const currentIndex = phaseSequence.indexOf(currentPhase);

  if (currentIndex === -1 || currentIndex === phaseSequence.length - 1) {
    return null;
  }

  return phaseSequence[currentIndex + 1];
}

/**
 * Get the previous phase
 */
export function getPreviousPhase(currentPhase: Phase): Phase | null {
  const phaseSequence: Phase[] = [
    "freshman",
    "sophomore",
    "junior",
    "senior",
    "committed",
  ];
  const currentIndex = phaseSequence.indexOf(currentPhase);

  if (currentIndex <= 0) {
    return null;
  }

  return phaseSequence[currentIndex - 1];
}

/**
 * Get milestone data to store in profile
 */
export interface PhaseMilestoneData {
  current_phase: Phase;
  milestones_by_phase: Record<
    Phase,
    {
      required: string[];
      completed: string[];
      percent_complete: number;
    }
  >;
  last_phase_update: string;
}

export function buildPhaseMilestoneData(
  phase: Phase,
  completedTaskIds: string[],
): PhaseMilestoneData {
  const phaseSequence: Phase[] = [
    "freshman",
    "sophomore",
    "junior",
    "senior",
    "committed",
  ];

  const milestones_by_phase: Record<
    Phase,
    {
      required: string[];
      completed: string[];
      percent_complete: number;
    }
  > = {} as Record<
    Phase,
    {
      required: string[];
      completed: string[];
      percent_complete: number;
    }
  >;

  phaseSequence.forEach((p) => {
    const progress = getMilestoneProgress(p, completedTaskIds);
    milestones_by_phase[p] = {
      required: progress.required,
      completed: progress.completed,
      percent_complete: progress.percentComplete,
    };
  });

  return {
    current_phase: phase,
    milestones_by_phase,
    last_phase_update: new Date().toISOString(),
  };
}
