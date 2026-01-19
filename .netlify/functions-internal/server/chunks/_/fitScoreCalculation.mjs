const FIT_THRESHOLDS = {
  match: 70,
  reach: 50};
function calculateFitScore(inputs) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const normalized = {
    athleticFit: (_a = inputs.athleticFit) != null ? _a : 0,
    academicFit: (_b = inputs.academicFit) != null ? _b : 0,
    opportunityFit: (_c = inputs.opportunityFit) != null ? _c : 0,
    personalFit: (_d = inputs.personalFit) != null ? _d : 0
  };
  normalized.athleticFit = Math.max(0, Math.min(40, (_e = normalized.athleticFit) != null ? _e : 0));
  normalized.academicFit = Math.max(0, Math.min(25, (_f = normalized.academicFit) != null ? _f : 0));
  normalized.opportunityFit = Math.max(0, Math.min(20, (_g = normalized.opportunityFit) != null ? _g : 0));
  normalized.personalFit = Math.max(0, Math.min(15, (_h = normalized.personalFit) != null ? _h : 0));
  const score = normalized.athleticFit + normalized.academicFit + normalized.opportunityFit + normalized.personalFit;
  const tier = getFitTier(score);
  const missingDimensions = [];
  if (normalized.athleticFit === 0) missingDimensions.push("athletic");
  if (normalized.academicFit === 0) missingDimensions.push("academic");
  if (normalized.opportunityFit === 0) missingDimensions.push("opportunity");
  if (normalized.personalFit === 0) missingDimensions.push("personal");
  return {
    score: Math.round(score),
    tier,
    breakdown: normalized,
    missingDimensions
  };
}
function getFitTier(score) {
  if (score >= FIT_THRESHOLDS.match) {
    return "match";
  } else if (score >= FIT_THRESHOLDS.reach) {
    return "reach";
  } else {
    return "unlikely";
  }
}
function calculatePortfolioHealth(schools = []) {
  if (schools.length === 0) {
    return {
      reaches: 0,
      matches: 0,
      safeties: 0,
      unlikelies: 0,
      total: 0,
      warnings: [
        "You haven't added any schools yet. Start building your college list!"
      ],
      status: "not_started"
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
  const warnings = [];
  let status = "healthy";
  if (safeties === 0 && total > 0) {
    warnings.push("Add at least 2-3 safety schools to ensure you have options.");
    status = "needs_attention";
  }
  if (matches === 0 && total > 0) {
    warnings.push("Consider adding match schools where you have a realistic chance.");
    status = "needs_attention";
  }
  if (reaches > matches + safeties) {
    warnings.push(
      "You have more reach schools than match and safety combined. Balance your list."
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
    status
  };
}

export { calculateFitScore as a, calculatePortfolioHealth as c };
//# sourceMappingURL=fitScoreCalculation.mjs.map
