const STATUS_WEIGHTS = {
  taskCompletion: 0.35,
  interactionFrequency: 0.25,
  coachInterest: 0.25,
  academicStanding: 0.15
};
const STATUS_THRESHOLDS = {
  onTrack: 75,
  slightlyBehind: 50};
function calculateCompositeScore(inputs) {
  var _a, _b, _c, _d;
  const normalized = {
    taskCompletionRate: Math.max(0, Math.min(100, (_a = inputs.taskCompletionRate) != null ? _a : 0)),
    interactionFrequencyScore: Math.max(0, Math.min(100, (_b = inputs.interactionFrequencyScore) != null ? _b : 0)),
    coachInterestScore: Math.max(0, Math.min(100, (_c = inputs.coachInterestScore) != null ? _c : 0)),
    academicStandingScore: Math.max(0, Math.min(100, (_d = inputs.academicStandingScore) != null ? _d : 0))
  };
  const score = normalized.taskCompletionRate * STATUS_WEIGHTS.taskCompletion + normalized.interactionFrequencyScore * STATUS_WEIGHTS.interactionFrequency + normalized.coachInterestScore * STATUS_WEIGHTS.coachInterest + normalized.academicStandingScore * STATUS_WEIGHTS.academicStanding;
  return Math.round(Math.max(0, Math.min(100, score)));
}
function getStatusLabel(score) {
  if (score >= STATUS_THRESHOLDS.onTrack) {
    return "on_track";
  } else if (score >= STATUS_THRESHOLDS.slightlyBehind) {
    return "slightly_behind";
  } else {
    return "at_risk";
  }
}
function getStatusColor(label) {
  switch (label) {
    case "on_track":
      return "green";
    case "slightly_behind":
      return "yellow";
    case "at_risk":
      return "red";
  }
}
function calculateTaskCompletionRate(completedTaskIds, requiredTaskIds) {
  if (requiredTaskIds.length === 0) return 0;
  const completed = requiredTaskIds.filter((taskId) => completedTaskIds.includes(taskId)).length;
  return completed / requiredTaskIds.length * 100;
}
function calculateInteractionFrequencyScore(lastInteractionDate, daysSinceLastInteraction, targetSchools) {
  if (!lastInteractionDate || targetSchools === 0) {
    return 0;
  }
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
function calculateCoachInterestScore(interestLevels, prioritySchoolInterestCount = 0) {
  if (interestLevels.length === 0) {
    return 0;
  }
  const highInterestCount = interestLevels.filter((l) => l === "high").length;
  const mediumInterestCount = interestLevels.filter((l) => l === "medium").length;
  const lowInterestCount = interestLevels.filter((l) => l === "low").length;
  const baseScore = (highInterestCount * 100 + mediumInterestCount * 60 + lowInterestCount * 20) / interestLevels.length;
  const priorityBonus = Math.min(10, prioritySchoolInterestCount * 5);
  return Math.min(100, baseScore + priorityBonus);
}
function calculateAcademicStandingScore(gpa, testScores, eligibilityStatus, targetDivisions) {
  let score = 0;
  if (gpa !== null) {
    if (gpa >= 3.5) {
      score += 40;
    } else if (gpa >= 3) {
      score += 30;
    } else if (gpa >= 2.5) {
      score += 20;
    } else if (gpa >= 2) {
      score += 10;
    } else {
      score += 0;
    }
  }
  if (testScores) {
    if (testScores.sat) {
      if (testScores.sat >= 1200) {
        score += 30;
      } else if (testScores.sat >= 1e3) {
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
  if (eligibilityStatus === "registered") {
    score += 30;
  } else if (eligibilityStatus === "pending") {
    score += 15;
  }
  return Math.min(100, score);
}
function calculateStatusScoreResult(inputs) {
  var _a, _b, _c, _d;
  const score = calculateCompositeScore(inputs);
  const label = getStatusLabel(score);
  const color = getStatusColor(label);
  return {
    score,
    label,
    color,
    breakdown: {
      taskCompletionRate: (_a = inputs.taskCompletionRate) != null ? _a : 0,
      interactionFrequencyScore: (_b = inputs.interactionFrequencyScore) != null ? _b : 0,
      coachInterestScore: (_c = inputs.coachInterestScore) != null ? _c : 0,
      academicStandingScore: (_d = inputs.academicStandingScore) != null ? _d : 0
    }
  };
}

export { calculateTaskCompletionRate as a, calculateInteractionFrequencyScore as b, calculateStatusScoreResult as c, calculateCoachInterestScore as d, calculateAcademicStandingScore as e };
//# sourceMappingURL=statusScoreCalculation.mjs.map
