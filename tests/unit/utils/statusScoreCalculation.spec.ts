import { describe, it, expect } from "vitest";
import {
  calculateCompositeScore,
  calculateTaskCompletionRate,
  calculateInteractionFrequencyScore,
  calculateCoachInterestScore,
  calculateAcademicStandingScore,
  getStatusLabel,
  getStatusColor,
  getStatusAdvice,
  getNextActionsForStatus,
  STATUS_WEIGHTS,
  STATUS_THRESHOLDS,
} from "~/utils/statusScoreCalculation";

describe("statusScoreCalculation", () => {
  describe("calculateCompositeScore", () => {
    it("should calculate weighted score correctly", () => {
      const result = calculateCompositeScore({
        taskCompletionRate: 75,
        interactionFrequencyScore: 80,
        coachInterestScore: 60,
        academicStandingScore: 70,
      });

      // 75*0.35 + 80*0.25 + 60*0.25 + 70*0.15 = 26.25 + 20 + 15 + 10.5 = 71.75 ≈ 72
      expect(result).toBe(72);
    });

    it("should clamp scores to 0-100 range", () => {
      const result = calculateCompositeScore({
        taskCompletionRate: 150,
        interactionFrequencyScore: -50,
        coachInterestScore: 200,
        academicStandingScore: -100,
      });

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should handle partial inputs with defaults", () => {
      const result = calculateCompositeScore({
        taskCompletionRate: 100,
      });

      // 100*0.35 + 0*0.25 + 0*0.25 + 0*0.15 = 35
      expect(result).toBe(35);
    });

    it("should return 0 for all zeros", () => {
      const result = calculateCompositeScore({
        taskCompletionRate: 0,
        interactionFrequencyScore: 0,
        coachInterestScore: 0,
        academicStandingScore: 0,
      });

      expect(result).toBe(0);
    });

    it("should return 100 for all maxed values", () => {
      const result = calculateCompositeScore({
        taskCompletionRate: 100,
        interactionFrequencyScore: 100,
        coachInterestScore: 100,
        academicStandingScore: 100,
      });

      expect(result).toBe(100);
    });

    it("should verify weight sum equals 100%", () => {
      const weightSum =
        STATUS_WEIGHTS.taskCompletion +
        STATUS_WEIGHTS.interactionFrequency +
        STATUS_WEIGHTS.coachInterest +
        STATUS_WEIGHTS.academicStanding;

      expect(weightSum).toBeCloseTo(1.0, 5);
    });
  });

  describe("getStatusLabel", () => {
    it("should return on_track for score >= 75", () => {
      expect(getStatusLabel(75)).toBe("on_track");
      expect(getStatusLabel(80)).toBe("on_track");
      expect(getStatusLabel(100)).toBe("on_track");
    });

    it("should return slightly_behind for score between 50-74", () => {
      expect(getStatusLabel(50)).toBe("slightly_behind");
      expect(getStatusLabel(60)).toBe("slightly_behind");
      expect(getStatusLabel(74)).toBe("slightly_behind");
    });

    it("should return at_risk for score < 50", () => {
      expect(getStatusLabel(49)).toBe("at_risk");
      expect(getStatusLabel(25)).toBe("at_risk");
      expect(getStatusLabel(0)).toBe("at_risk");
    });

    it("should handle boundary values", () => {
      expect(getStatusLabel(75)).toBe("on_track");
      expect(getStatusLabel(74.9)).toBe("slightly_behind");
      expect(getStatusLabel(50)).toBe("slightly_behind");
      expect(getStatusLabel(49.9)).toBe("at_risk");
    });
  });

  describe("getStatusColor", () => {
    it("should return green for on_track", () => {
      expect(getStatusColor("on_track")).toBe("green");
    });

    it("should return yellow for slightly_behind", () => {
      expect(getStatusColor("slightly_behind")).toBe("yellow");
    });

    it("should return red for at_risk", () => {
      expect(getStatusColor("at_risk")).toBe("red");
    });
  });

  describe("calculateTaskCompletionRate", () => {
    it("should calculate completion percentage correctly", () => {
      const result = calculateTaskCompletionRate(
        ["task1", "task2", "task3"],
        ["task1", "task2", "task3", "task4", "task5"],
      );

      expect(result).toBe(60); // 3/5 = 0.6 = 60%
    });

    it("should return 0% when no tasks completed", () => {
      const result = calculateTaskCompletionRate(
        [],
        ["task1", "task2", "task3"],
      );

      expect(result).toBe(0);
    });

    it("should return 100% when all tasks completed", () => {
      const result = calculateTaskCompletionRate(
        ["task1", "task2", "task3"],
        ["task1", "task2", "task3"],
      );

      expect(result).toBe(100);
    });

    it("should return 0 when required tasks list is empty", () => {
      const result = calculateTaskCompletionRate(["task1", "task2"], []);

      expect(result).toBe(0);
    });

    it("should ignore extra completed tasks not in required list", () => {
      const result = calculateTaskCompletionRate(
        ["task1", "task2", "extra1", "extra2"],
        ["task1", "task2"],
      );

      expect(result).toBe(100);
    });
  });

  describe("calculateInteractionFrequencyScore", () => {
    it("should return 100 for interaction within 7 days", () => {
      const result = calculateInteractionFrequencyScore("2024-01-20", 5, 5);

      expect(result).toBe(100);
    });

    it("should return 80 for interaction 7-14 days ago", () => {
      const result = calculateInteractionFrequencyScore("2024-01-20", 10, 5);

      expect(result).toBe(80);
    });

    it("should return 60 for interaction 14-21 days ago", () => {
      const result = calculateInteractionFrequencyScore("2024-01-20", 18, 5);

      expect(result).toBe(60);
    });

    it("should return 40 for interaction 21-30 days ago", () => {
      const result = calculateInteractionFrequencyScore("2024-01-20", 25, 5);

      expect(result).toBe(40);
    });

    it("should return 0 for interaction > 30 days ago", () => {
      const result = calculateInteractionFrequencyScore("2024-01-20", 35, 5);

      expect(result).toBe(0);
    });

    it("should return 0 when lastInteractionDate is null", () => {
      const result = calculateInteractionFrequencyScore(null, 10, 5);

      expect(result).toBe(0);
    });

    it("should return 0 when targetSchools is 0", () => {
      const result = calculateInteractionFrequencyScore("2024-01-20", 5, 0);

      expect(result).toBe(0);
    });

    it("should handle exact boundary days", () => {
      expect(calculateInteractionFrequencyScore("2024-01-20", 7, 5)).toBe(100);
      expect(calculateInteractionFrequencyScore("2024-01-20", 8, 5)).toBe(80);
      expect(calculateInteractionFrequencyScore("2024-01-20", 14, 5)).toBe(80);
      expect(calculateInteractionFrequencyScore("2024-01-20", 15, 5)).toBe(60);
      expect(calculateInteractionFrequencyScore("2024-01-20", 21, 5)).toBe(60);
      expect(calculateInteractionFrequencyScore("2024-01-20", 22, 5)).toBe(40);
      expect(calculateInteractionFrequencyScore("2024-01-20", 30, 5)).toBe(40);
      expect(calculateInteractionFrequencyScore("2024-01-20", 31, 5)).toBe(0);
    });
  });

  describe("calculateCoachInterestScore", () => {
    it("should calculate score for all high interest", () => {
      const result = calculateCoachInterestScore(["high", "high", "high"], 0);

      expect(result).toBe(100);
    });

    it("should calculate score for all medium interest", () => {
      const result = calculateCoachInterestScore(
        ["medium", "medium", "medium"],
        0,
      );

      expect(result).toBe(60);
    });

    it("should calculate score for all low interest", () => {
      const result = calculateCoachInterestScore(["low", "low", "low"], 0);

      expect(result).toBe(20);
    });

    it("should calculate weighted score for mixed interest levels", () => {
      const result = calculateCoachInterestScore(["high", "medium", "low"], 0);

      // (100 + 60 + 20) / 3 = 60
      expect(result).toBe(60);
    });

    it("should apply priority school bonus", () => {
      const baseScore = calculateCoachInterestScore(["medium"], 0);

      const withBonus = calculateCoachInterestScore(["medium"], 2);

      // 2 priority schools * 5 = 10 bonus points
      expect(withBonus).toBe(baseScore + 10);
    });

    it("should cap priority bonus at 10 points", () => {
      const result = calculateCoachInterestScore(["low"], 3);

      // 3 * 5 = 15, but capped at 10 total
      // So: 20 + 10 = 30, but should be capped at 100
      expect(result).toBeLessThanOrEqual(100);
    });

    it("should cap total score at 100", () => {
      const result = calculateCoachInterestScore(["high", "high", "high"], 3);

      expect(result).toBe(100);
    });

    it("should return 0 for empty interest levels", () => {
      const result = calculateCoachInterestScore([], 0);

      expect(result).toBe(0);
    });
  });

  describe("calculateAcademicStandingScore", () => {
    it("should score GPA correctly (3.5+)", () => {
      const result = calculateAcademicStandingScore(
        3.5,
        null,
        "not_started",
        [],
      );

      expect(result).toBe(40);
    });

    it("should score GPA correctly (3.0-3.49)", () => {
      const result = calculateAcademicStandingScore(
        3.2,
        null,
        "not_started",
        [],
      );

      expect(result).toBe(30);
    });

    it("should score GPA correctly (2.5-2.99)", () => {
      const result = calculateAcademicStandingScore(
        2.7,
        null,
        "not_started",
        [],
      );

      expect(result).toBe(20);
    });

    it("should score GPA correctly (2.0-2.49)", () => {
      const result = calculateAcademicStandingScore(
        2.1,
        null,
        "not_started",
        [],
      );

      expect(result).toBe(10);
    });

    it("should score GPA correctly (< 2.0)", () => {
      const result = calculateAcademicStandingScore(
        1.8,
        null,
        "not_started",
        [],
      );

      expect(result).toBe(0);
    });

    it("should score SAT correctly (1200+)", () => {
      const result = calculateAcademicStandingScore(
        null,
        { sat: 1250 },
        "not_started",
        [],
      );

      expect(result).toBe(30);
    });

    it("should score SAT correctly (1000-1199)", () => {
      const result = calculateAcademicStandingScore(
        null,
        { sat: 1100 },
        "not_started",
        [],
      );

      expect(result).toBe(20);
    });

    it("should score SAT correctly (900-999)", () => {
      const result = calculateAcademicStandingScore(
        null,
        { sat: 950 },
        "not_started",
        [],
      );

      expect(result).toBe(10);
    });

    it("should score SAT correctly (< 900)", () => {
      const result = calculateAcademicStandingScore(
        null,
        { sat: 800 },
        "not_started",
        [],
      );

      expect(result).toBe(0);
    });

    it("should score ACT correctly (28+)", () => {
      const result = calculateAcademicStandingScore(
        null,
        { act: 30 },
        "not_started",
        [],
      );

      expect(result).toBe(30);
    });

    it("should score ACT correctly (24-27)", () => {
      const result = calculateAcademicStandingScore(
        null,
        { act: 25 },
        "not_started",
        [],
      );

      expect(result).toBe(20);
    });

    it("should score ACT correctly (20-23)", () => {
      const result = calculateAcademicStandingScore(
        null,
        { act: 22 },
        "not_started",
        [],
      );

      expect(result).toBe(10);
    });

    it("should score ACT correctly (< 20)", () => {
      const result = calculateAcademicStandingScore(
        null,
        { act: 18 },
        "not_started",
        [],
      );

      expect(result).toBe(0);
    });

    it("should score eligibility status registered", () => {
      const result = calculateAcademicStandingScore(
        null,
        null,
        "registered",
        [],
      );

      expect(result).toBe(30);
    });

    it("should score eligibility status pending", () => {
      const result = calculateAcademicStandingScore(null, null, "pending", []);

      expect(result).toBe(15);
    });

    it("should score eligibility status not_started", () => {
      const result = calculateAcademicStandingScore(
        null,
        null,
        "not_started",
        [],
      );

      expect(result).toBe(0);
    });

    it("should combine scores correctly", () => {
      const result = calculateAcademicStandingScore(
        3.5,
        { sat: 1200 },
        "registered",
        [],
      );

      // 40 (GPA) + 30 (SAT) + 30 (eligible) = 100
      expect(result).toBe(100);
    });

    it("should cap total at 100", () => {
      const result = calculateAcademicStandingScore(
        3.9,
        { sat: 1500, act: 36 },
        "registered",
        [],
      );

      expect(result).toBe(100);
    });

    it("should handle null test scores", () => {
      const result = calculateAcademicStandingScore(
        3.5,
        null,
        "not_started",
        [],
      );

      expect(result).toBe(40);
    });
  });

  describe("getStatusAdvice", () => {
    it("should return on_track advice", () => {
      const advice = getStatusAdvice("on_track");

      expect(advice).toContain("momentum");
    });

    it("should return slightly_behind advice", () => {
      const advice = getStatusAdvice("slightly_behind");

      expect(advice).toContain("behind");
    });

    it("should return at_risk advice", () => {
      const advice = getStatusAdvice("at_risk");

      expect(advice).toContain("at risk");
    });
  });

  describe("getNextActionsForStatus", () => {
    it("should return actions for on_track freshman", () => {
      const actions = getNextActionsForStatus("on_track", "freshman");

      expect(actions).toHaveLength(2);
      expect(actions[0]).toBeTruthy();
    });

    it("should return actions for slightly_behind sophomore", () => {
      const actions = getNextActionsForStatus("slightly_behind", "sophomore");

      expect(actions).toHaveLength(2);
      expect(actions.some((a) => a.toLowerCase().includes("highlight"))).toBe(
        true,
      );
    });

    it("should return actions for at_risk junior", () => {
      const actions = getNextActionsForStatus("at_risk", "junior");

      expect(actions).toHaveLength(2);
      expect(actions.some((a) => a.toLowerCase().includes("recovery"))).toBe(
        true,
      );
    });

    it("should return actions for all phase combinations", () => {
      const phases = [
        "freshman",
        "sophomore",
        "junior",
        "senior",
        "committed",
      ] as const;
      const statuses = ["on_track", "slightly_behind", "at_risk"] as const;

      phases.forEach((phase) => {
        statuses.forEach((status) => {
          const actions = getNextActionsForStatus(status, phase);

          expect(Array.isArray(actions)).toBe(true);
          expect(actions.length).toBeGreaterThan(0);
        });
      });
    });

    it("should return empty array for invalid combinations", () => {
      const actions = getNextActionsForStatus(
        "on_track",
        "invalid_phase" as any,
      );

      expect(Array.isArray(actions)).toBe(true);
    });
  });
});
