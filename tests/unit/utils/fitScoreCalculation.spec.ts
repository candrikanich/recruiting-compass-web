import { describe, it, expect } from "vitest";
import {
  calculatePersonalFitSignals,
  calculateAcademicFitSignals,
  calculateFitScore,
  getFitTier,
  getFitTierColor,
  calculateAthleticFit,
  calculateOpportunityFit,
  calculateAcademicFit,
  calculatePersonalFit,
  getFitScoreRecommendation,
  calculatePortfolioHealth,
  FIT_WEIGHTS,
  FIT_THRESHOLDS,
} from "~/utils/fitScoreCalculation";

describe("fitScoreCalculation", () => {
  // ─── Constants ──────────────────────────────────────────────────────────────

  describe("FIT_WEIGHTS", () => {
    it("has expected shape with all zero weights (deprecated)", () => {
      expect(FIT_WEIGHTS).toEqual({
        athletic: 0,
        academic: 0,
        opportunity: 0,
        personal: 0,
      });
    });
  });

  describe("FIT_THRESHOLDS", () => {
    it("has expected tier thresholds", () => {
      expect(FIT_THRESHOLDS).toEqual({ match: 70, reach: 50, unlikely: 0 });
    });
  });

  // ─── calculatePersonalFitSignals ─────────────────────────────────────────────

  describe("calculatePersonalFitSignals", () => {
    const baseSchool = {
      state: "CA",
      student_size: 12000,
      tuition_out_of_state: 30000,
    };

    const baseAthlete = {
      school_state: "CA",
      campus_size_preference: "medium" as const,
      cost_sensitivity: "medium" as const,
    };

    it("returns 3 available signals when all preferences and school data are present", () => {
      const result = calculatePersonalFitSignals(baseAthlete, baseSchool);
      expect(result.availableSignals).toBe(3);
      expect(result.signals.location.strength).toBe("strong");
      expect(result.signals.campusSize.strength).toBe("strong");
      expect(result.signals.cost.strength).toBe("strong");
    });

    it("returns 0 available signals when all data is missing", () => {
      const result = calculatePersonalFitSignals({}, {});
      expect(result.availableSignals).toBe(0);
      expect(result.signals.location.strength).toBe("unknown");
      expect(result.signals.campusSize.strength).toBe("unknown");
      expect(result.signals.cost.strength).toBe("unknown");
    });

    describe("location signal", () => {
      it("returns strong when athlete and school are in same state", () => {
        const result = calculatePersonalFitSignals(
          { school_state: "TX" },
          { state: "TX" },
        );
        expect(result.signals.location.strength).toBe("strong");
        expect(result.signals.location.value).toBe("In-state");
      });

      it("returns stretch when athlete and school are in different states", () => {
        const result = calculatePersonalFitSignals(
          { school_state: "TX" },
          { state: "CA" },
        );
        expect(result.signals.location.strength).toBe("stretch");
        expect(result.signals.location.value).toBe("Out-of-state (CA)");
      });

      it("returns unknown when athlete state is missing", () => {
        const result = calculatePersonalFitSignals({}, { state: "CA" });
        expect(result.signals.location.strength).toBe("unknown");
        expect(result.signals.location.value).toBeNull();
      });

      it("returns unknown when school state is missing", () => {
        const result = calculatePersonalFitSignals({ school_state: "CA" }, {});
        expect(result.signals.location.strength).toBe("unknown");
      });
    });

    describe("campus size signal", () => {
      it("returns unknown when student_size is missing", () => {
        const result = calculatePersonalFitSignals(
          { campus_size_preference: "small" },
          {},
        );
        expect(result.signals.campusSize.strength).toBe("unknown");
        expect(result.signals.campusSize.value).toBeNull();
      });

      it("returns unknown (but shows size) when preference is missing", () => {
        const result = calculatePersonalFitSignals({}, { student_size: 3000 });
        expect(result.signals.campusSize.strength).toBe("unknown");
        expect(result.signals.campusSize.value).toContain("Small");
      });

      it("small preference matches school under 5000 students", () => {
        const result = calculatePersonalFitSignals(
          { campus_size_preference: "small" },
          { student_size: 4999 },
        );
        expect(result.signals.campusSize.strength).toBe("strong");
      });

      it("small preference does not match school at 5000 students (boundary)", () => {
        const result = calculatePersonalFitSignals(
          { campus_size_preference: "small" },
          { student_size: 5000 },
        );
        expect(result.signals.campusSize.strength).toBe("stretch");
      });

      it("medium preference matches school between 5000 and 25000 students", () => {
        const result = calculatePersonalFitSignals(
          { campus_size_preference: "medium" },
          { student_size: 15000 },
        );
        expect(result.signals.campusSize.strength).toBe("strong");
      });

      it("medium preference matches at exactly 5000 (lower boundary)", () => {
        const result = calculatePersonalFitSignals(
          { campus_size_preference: "medium" },
          { student_size: 5000 },
        );
        expect(result.signals.campusSize.strength).toBe("strong");
      });

      it("medium preference matches at exactly 25000 (upper boundary)", () => {
        const result = calculatePersonalFitSignals(
          { campus_size_preference: "medium" },
          { student_size: 25000 },
        );
        expect(result.signals.campusSize.strength).toBe("strong");
      });

      it("large preference matches school over 25000 students", () => {
        const result = calculatePersonalFitSignals(
          { campus_size_preference: "large" },
          { student_size: 25001 },
        );
        expect(result.signals.campusSize.strength).toBe("strong");
      });

      it("large preference does not match medium school", () => {
        const result = calculatePersonalFitSignals(
          { campus_size_preference: "large" },
          { student_size: 15000 },
        );
        expect(result.signals.campusSize.strength).toBe("stretch");
      });

      it("size label shows Small for < 5000", () => {
        const result = calculatePersonalFitSignals(
          { campus_size_preference: "small" },
          { student_size: 3000 },
        );
        expect(result.signals.campusSize.value).toContain("Small");
      });

      it("size label shows Large for > 25000", () => {
        const result = calculatePersonalFitSignals(
          { campus_size_preference: "large" },
          { student_size: 30000 },
        );
        expect(result.signals.campusSize.value).toContain("Large");
      });
    });

    describe("cost signal", () => {
      it("returns unknown when no cost data available", () => {
        const result = calculatePersonalFitSignals(
          { cost_sensitivity: "high" },
          {},
        );
        expect(result.signals.cost.strength).toBe("unknown");
        expect(result.signals.cost.value).toBeNull();
      });

      it("returns unknown (but shows cost) when sensitivity is missing", () => {
        const result = calculatePersonalFitSignals(
          {},
          { tuition_out_of_state: 25000 },
        );
        expect(result.signals.cost.strength).toBe("unknown");
        expect(result.signals.cost.value).toContain("$");
      });

      it("uses tuition_out_of_state if available", () => {
        const result = calculatePersonalFitSignals(
          { cost_sensitivity: "low" },
          { tuition_in_state: 10000, tuition_out_of_state: 30000 },
        );
        expect(result.signals.cost.value).toContain("30,000");
      });

      it("falls back to tuition_in_state when out_of_state is not present", () => {
        const result = calculatePersonalFitSignals(
          { cost_sensitivity: "low" },
          { tuition_in_state: 12000 },
        );
        expect(result.signals.cost.value).toContain("12,000");
      });

      describe("high sensitivity", () => {
        it("strong at <= 20000", () => {
          const result = calculatePersonalFitSignals(
            { cost_sensitivity: "high" },
            { tuition_out_of_state: 20000 },
          );
          expect(result.signals.cost.strength).toBe("strong");
        });

        it("good at 20001", () => {
          const result = calculatePersonalFitSignals(
            { cost_sensitivity: "high" },
            { tuition_out_of_state: 20001 },
          );
          expect(result.signals.cost.strength).toBe("good");
        });

        it("good at 35000 (boundary)", () => {
          const result = calculatePersonalFitSignals(
            { cost_sensitivity: "high" },
            { tuition_out_of_state: 35000 },
          );
          expect(result.signals.cost.strength).toBe("good");
        });

        it("stretch at 35001", () => {
          const result = calculatePersonalFitSignals(
            { cost_sensitivity: "high" },
            { tuition_out_of_state: 35001 },
          );
          expect(result.signals.cost.strength).toBe("stretch");
        });
      });

      describe("medium sensitivity", () => {
        it("strong at <= 35000", () => {
          const result = calculatePersonalFitSignals(
            { cost_sensitivity: "medium" },
            { tuition_out_of_state: 35000 },
          );
          expect(result.signals.cost.strength).toBe("strong");
        });

        it("good at 35001", () => {
          const result = calculatePersonalFitSignals(
            { cost_sensitivity: "medium" },
            { tuition_out_of_state: 35001 },
          );
          expect(result.signals.cost.strength).toBe("good");
        });

        it("good at 55000 (boundary)", () => {
          const result = calculatePersonalFitSignals(
            { cost_sensitivity: "medium" },
            { tuition_out_of_state: 55000 },
          );
          expect(result.signals.cost.strength).toBe("good");
        });

        it("stretch at 55001", () => {
          const result = calculatePersonalFitSignals(
            { cost_sensitivity: "medium" },
            { tuition_out_of_state: 55001 },
          );
          expect(result.signals.cost.strength).toBe("stretch");
        });
      });

      describe("low sensitivity", () => {
        it("always strong regardless of cost", () => {
          const result1 = calculatePersonalFitSignals(
            { cost_sensitivity: "low" },
            { tuition_out_of_state: 1000 },
          );
          const result2 = calculatePersonalFitSignals(
            { cost_sensitivity: "low" },
            { tuition_out_of_state: 80000 },
          );
          expect(result1.signals.cost.strength).toBe("strong");
          expect(result2.signals.cost.strength).toBe("strong");
        });
      });
    });
  });

  // ─── calculateAcademicFitSignals ─────────────────────────────────────────────

  describe("calculateAcademicFitSignals", () => {
    const schoolWithData = {
      sat_25th: 1200,
      sat_75th: 1450,
      act_25th: 27,
      act_75th: 33,
      admission_rate: 0.45,
    };

    it("returns 2 available signals when both athlete scores and school data exist", () => {
      const result = calculateAcademicFitSignals(
        { sat_score: 1300, act_score: 30 },
        schoolWithData,
      );
      expect(result.availableSignals).toBe(2);
      expect(result.hasSchoolData).toBe(true);
    });

    it("returns admission rate from school", () => {
      const result = calculateAcademicFitSignals(
        { sat_score: 1300, act_score: 30 },
        schoolWithData,
      );
      expect(result.admissionRate).toBe(0.45);
    });

    it("returns null admissionRate when not in school data", () => {
      const result = calculateAcademicFitSignals(
        { sat_score: 1300 },
        { sat_25th: 1200, sat_75th: 1450 },
      );
      expect(result.admissionRate).toBeNull();
    });

    it("hasSchoolData is false when no SAT or ACT ranges available", () => {
      const result = calculateAcademicFitSignals({ sat_score: 1300 }, {});
      expect(result.hasSchoolData).toBe(false);
    });

    it("hasSchoolData is true when only SAT data is present", () => {
      const result = calculateAcademicFitSignals(
        { sat_score: 1300 },
        { sat_25th: 1200, sat_75th: 1450 },
      );
      expect(result.hasSchoolData).toBe(true);
    });

    it("returns 0 available signals when athlete has no scores", () => {
      const result = calculateAcademicFitSignals({}, schoolWithData);
      expect(result.availableSignals).toBe(0);
    });

    describe("SAT signal", () => {
      it("above when athlete SAT >= 75th percentile", () => {
        const result = calculateAcademicFitSignals(
          { sat_score: 1450 },
          { sat_25th: 1200, sat_75th: 1450 },
        );
        expect(result.signals.sat.strength).toBe("above");
      });

      it("above when athlete SAT exceeds 75th percentile", () => {
        const result = calculateAcademicFitSignals(
          { sat_score: 1500 },
          { sat_25th: 1200, sat_75th: 1450 },
        );
        expect(result.signals.sat.strength).toBe("above");
      });

      it("in-range when athlete SAT is between 25th and 75th percentile", () => {
        const result = calculateAcademicFitSignals(
          { sat_score: 1300 },
          { sat_25th: 1200, sat_75th: 1450 },
        );
        expect(result.signals.sat.strength).toBe("in-range");
      });

      it("in-range at exactly the 25th percentile (lower boundary)", () => {
        const result = calculateAcademicFitSignals(
          { sat_score: 1200 },
          { sat_25th: 1200, sat_75th: 1450 },
        );
        expect(result.signals.sat.strength).toBe("in-range");
      });

      it("below when athlete SAT is below 25th percentile", () => {
        const result = calculateAcademicFitSignals(
          { sat_score: 1100 },
          { sat_25th: 1200, sat_75th: 1450 },
        );
        expect(result.signals.sat.strength).toBe("below");
      });

      it("unknown when athlete has no SAT score", () => {
        const result = calculateAcademicFitSignals(
          {},
          { sat_25th: 1200, sat_75th: 1450 },
        );
        expect(result.signals.sat.strength).toBe("unknown");
        expect(result.signals.sat.athleteValue).toBeNull();
        expect(result.signals.sat.schoolRange).toEqual({ low: 1200, high: 1450 });
      });

      it("unknown when school has no SAT data", () => {
        const result = calculateAcademicFitSignals({ sat_score: 1300 }, {});
        expect(result.signals.sat.strength).toBe("unknown");
        expect(result.signals.sat.schoolRange).toBeNull();
      });

      it("includes athlete value and school range in result", () => {
        const result = calculateAcademicFitSignals(
          { sat_score: 1300 },
          { sat_25th: 1200, sat_75th: 1450 },
        );
        expect(result.signals.sat.athleteValue).toBe(1300);
        expect(result.signals.sat.schoolRange).toEqual({ low: 1200, high: 1450 });
      });
    });

    describe("ACT signal", () => {
      it("above when athlete ACT >= 75th percentile", () => {
        const result = calculateAcademicFitSignals(
          { act_score: 33 },
          { act_25th: 27, act_75th: 33 },
        );
        expect(result.signals.act.strength).toBe("above");
      });

      it("in-range when athlete ACT is between percentiles", () => {
        const result = calculateAcademicFitSignals(
          { act_score: 30 },
          { act_25th: 27, act_75th: 33 },
        );
        expect(result.signals.act.strength).toBe("in-range");
      });

      it("below when athlete ACT is below 25th percentile", () => {
        const result = calculateAcademicFitSignals(
          { act_score: 20 },
          { act_25th: 27, act_75th: 33 },
        );
        expect(result.signals.act.strength).toBe("below");
      });

      it("unknown when athlete has no ACT score", () => {
        const result = calculateAcademicFitSignals(
          {},
          { act_25th: 27, act_75th: 33 },
        );
        expect(result.signals.act.strength).toBe("unknown");
      });

      it("unknown when school has no ACT data", () => {
        const result = calculateAcademicFitSignals({ act_score: 30 }, {});
        expect(result.signals.act.strength).toBe("unknown");
      });
    });
  });

  // ─── Deprecated stubs ────────────────────────────────────────────────────────

  describe("calculateFitScore (deprecated stub)", () => {
    it("sums all fit inputs into score", () => {
      const result = calculateFitScore({
        athleticFit: 25,
        academicFit: 20,
        opportunityFit: 15,
        personalFit: 10,
      });
      expect(result.score).toBe(70);
    });

    it("defaults to 0 for missing inputs", () => {
      const result = calculateFitScore({});
      expect(result.score).toBe(0);
    });

    it("returns tier based on score", () => {
      const result = calculateFitScore({ athleticFit: 70 });
      expect(result.tier).toBe("match");
    });

    it("returns breakdown mirroring inputs", () => {
      const result = calculateFitScore({ athleticFit: 10, academicFit: 5 });
      expect(result.breakdown.athleticFit).toBe(10);
      expect(result.breakdown.academicFit).toBe(5);
      expect(result.breakdown.opportunityFit).toBe(0);
      expect(result.breakdown.personalFit).toBe(0);
    });

    it("returns empty missingDimensions array", () => {
      const result = calculateFitScore({});
      expect(result.missingDimensions).toEqual([]);
    });
  });

  describe("getFitTier (deprecated)", () => {
    it("returns match for score >= 70", () => {
      expect(getFitTier(70)).toBe("match");
      expect(getFitTier(100)).toBe("match");
    });

    it("returns reach for score >= 50 and < 70", () => {
      expect(getFitTier(50)).toBe("reach");
      expect(getFitTier(69)).toBe("reach");
    });

    it("returns unlikely for score < 50", () => {
      expect(getFitTier(49)).toBe("unlikely");
      expect(getFitTier(0)).toBe("unlikely");
    });
  });

  describe("getFitTierColor (deprecated)", () => {
    it("always returns slate regardless of tier", () => {
      expect(getFitTierColor("match")).toBe("slate");
      expect(getFitTierColor("reach")).toBe("slate");
      expect(getFitTierColor("unlikely")).toBe("slate");
      expect(getFitTierColor("safety")).toBe("slate");
    });
  });

  describe("calculateAthleticFit (deprecated)", () => {
    it("always returns 0", () => {
      expect(calculateAthleticFit()).toBe(0);
      expect(calculateAthleticFit("anything", 42)).toBe(0);
    });
  });

  describe("calculateOpportunityFit (deprecated)", () => {
    it("always returns 0", () => {
      expect(calculateOpportunityFit()).toBe(0);
      expect(calculateOpportunityFit("anything", 42)).toBe(0);
    });
  });

  describe("calculateAcademicFit (deprecated)", () => {
    it("always returns 0", () => {
      expect(calculateAcademicFit()).toBe(0);
    });
  });

  describe("calculatePersonalFit (deprecated)", () => {
    it("always returns 0", () => {
      expect(calculatePersonalFit()).toBe(0);
    });
  });

  describe("getFitScoreRecommendation (deprecated)", () => {
    it("always returns empty string", () => {
      expect(getFitScoreRecommendation()).toBe("");
      expect(getFitScoreRecommendation("anything")).toBe("");
    });
  });

  describe("calculatePortfolioHealth (deprecated)", () => {
    it("returns not_started stub with zeros", () => {
      const result = calculatePortfolioHealth();
      expect(result).toEqual({
        reaches: 0,
        matches: 0,
        safeties: 0,
        unlikelies: 0,
        total: 0,
        warnings: [],
        status: "not_started",
      });
    });
  });
});
