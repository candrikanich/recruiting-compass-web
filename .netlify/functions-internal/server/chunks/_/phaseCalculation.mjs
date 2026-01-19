const PHASE_MILESTONES = {
  freshmanToSophomore: [
    // Grade 9 required tasks for advancing to sophomore
    "understand-academic-requirements",
    "establish-development-routine",
    "play-travel-ball",
    "research-division-levels"
  ],
  sophomoreToJunior: [
    // Grade 10 required tasks for advancing to junior
    "create-highlight-video",
    "maintain-strong-gpa-10",
    "build-target-school-list-20",
    "send-first-introductory-emails"
  ],
  juniorToSenior: [
    // Grade 11 required tasks for advancing to senior
    "register-with-ncaa-eligibility",
    "peak-athletic-performance-11",
    "increase-coach-communication",
    "film-multiple-game-performances"
  ],
  seniorToCommitted: [
    // Grade 12 required task for advancement
    "sign-nli"
  ]
};
function calculatePhase(completedTaskIds, hasSignedNLI) {
  const juniorToSeniorMilestones = PHASE_MILESTONES.juniorToSenior;
  if (juniorToSeniorMilestones.every((taskId) => completedTaskIds.includes(taskId))) {
    return "senior";
  }
  const sophomoreToJuniorMilestones = PHASE_MILESTONES.sophomoreToJunior;
  if (sophomoreToJuniorMilestones.every((taskId) => completedTaskIds.includes(taskId))) {
    return "junior";
  }
  const freshmanToSophomoreMilestones = PHASE_MILESTONES.freshmanToSophomore;
  if (freshmanToSophomoreMilestones.every((taskId) => completedTaskIds.includes(taskId))) {
    return "sophomore";
  }
  return "freshman";
}
function getMilestoneProgress(phase, completedTaskIds) {
  let required = [];
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
        percentComplete: 100
      };
  }
  const completed = required.filter((taskId) => completedTaskIds.includes(taskId));
  const remaining = required.filter((taskId) => !completedTaskIds.includes(taskId));
  const percentComplete = required.length > 0 ? completed.length / required.length * 100 : 0;
  return {
    phase,
    required,
    completed,
    remaining,
    percentComplete
  };
}
function canAdvancePhase(currentPhase, completedTaskIds) {
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
function getNextPhase(currentPhase) {
  const phaseSequence = ["freshman", "sophomore", "junior", "senior", "committed"];
  const currentIndex = phaseSequence.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === phaseSequence.length - 1) {
    return null;
  }
  return phaseSequence[currentIndex + 1];
}
function buildPhaseMilestoneData(phase, completedTaskIds) {
  const phaseSequence = ["freshman", "sophomore", "junior", "senior", "committed"];
  const milestones_by_phase = {};
  phaseSequence.forEach((p) => {
    const progress = getMilestoneProgress(p, completedTaskIds);
    milestones_by_phase[p] = {
      required: progress.required,
      completed: progress.completed,
      percent_complete: progress.percentComplete
    };
  });
  return {
    current_phase: phase,
    milestones_by_phase,
    last_phase_update: (/* @__PURE__ */ new Date()).toISOString()
  };
}

export { canAdvancePhase as a, getNextPhase as b, calculatePhase as c, buildPhaseMilestoneData as d, getMilestoneProgress as g };
//# sourceMappingURL=phaseCalculation.mjs.map
