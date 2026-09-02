import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  gradeToPhase,
  computePhaseFromGraduationYear,
} from "~/server/utils/athletePhase";
import { getYearCompletionMilestones } from "~/utils/phaseCalculation";

// ---------------------------------------------------------------------------
// gradeToPhase
// ---------------------------------------------------------------------------

describe("gradeToPhase", () => {
  it("maps grade 9 → freshman", () => {
    expect(gradeToPhase(9)).toBe("freshman");
  });

  it("maps grade 10 → sophomore", () => {
    expect(gradeToPhase(10)).toBe("sophomore");
  });

  it("maps grade 11 → junior", () => {
    expect(gradeToPhase(11)).toBe("junior");
  });

  it("maps grade 12 → senior", () => {
    expect(gradeToPhase(12)).toBe("senior");
  });

  it("defaults to freshman for grade below range (8)", () => {
    expect(gradeToPhase(8)).toBe("freshman");
  });

  it("defaults to freshman for grade above range (13)", () => {
    expect(gradeToPhase(13)).toBe("freshman");
  });

  it("defaults to freshman for grade 0", () => {
    expect(gradeToPhase(0)).toBe("freshman");
  });

  it("defaults to freshman for negative grade (-1)", () => {
    expect(gradeToPhase(-1)).toBe("freshman");
  });

  it("defaults to freshman for fractional grade (10.5)", () => {
    expect(gradeToPhase(10.5)).toBe("freshman");
  });
});

// ---------------------------------------------------------------------------
// computePhaseFromGraduationYear
// ---------------------------------------------------------------------------

describe("computePhaseFromGraduationYear", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns freshman when graduationYear is null", () => {
    expect(computePhaseFromGraduationYear(null)).toBe("freshman");
  });

  it("returns freshman when graduationYear is 0 (falsy)", () => {
    expect(computePhaseFromGraduationYear(0)).toBe("freshman");
  });

  describe("with January 2026 date (pre-July roll)", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date(2026, 0, 15)); // Jan 15 2026
    });

    it("grad 2029 → freshman (grade 9)", () => {
      expect(computePhaseFromGraduationYear(2029)).toBe("freshman");
    });

    it("grad 2028 → sophomore (grade 10)", () => {
      expect(computePhaseFromGraduationYear(2028)).toBe("sophomore");
    });

    it("grad 2027 → junior (grade 11)", () => {
      expect(computePhaseFromGraduationYear(2027)).toBe("junior");
    });

    it("grad 2026 → senior (grade 12)", () => {
      expect(computePhaseFromGraduationYear(2026)).toBe("senior");
    });
  });

  describe("with July 2026 date (post-roll pivot)", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date(2026, 6, 1)); // Jul 1 2026
    });

    it("grad 2027 → senior (grade 12, rising senior)", () => {
      // Post-July: schoolYearEndYear = 2027, so grade = 12 - (2027 - 2027) = 12
      expect(computePhaseFromGraduationYear(2027)).toBe("senior");
    });

    it("grad 2030 → freshman (grade 9, rising freshman)", () => {
      // Post-July: schoolYearEndYear = 2027, so grade = 12 - (2030 - 2027) = 9
      expect(computePhaseFromGraduationYear(2030)).toBe("freshman");
    });

    it("grad 2029 → sophomore (grade 10, rising sophomore)", () => {
      expect(computePhaseFromGraduationYear(2029)).toBe("sophomore");
    });

    it("grad 2028 → junior (grade 11, rising junior)", () => {
      expect(computePhaseFromGraduationYear(2028)).toBe("junior");
    });
  });

  describe("clamped grades via calculateCurrentGrade", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date(2026, 0, 15)); // Jan 15 2026
    });

    it("very distant grad year (2035) clamps to grade 9 → freshman", () => {
      // grade = 12 - (2035 - 2026) = 3, clamped to 9
      expect(computePhaseFromGraduationYear(2035)).toBe("freshman");
    });

    it("past grad year (2020) clamps to grade 12 → senior", () => {
      // grade = 12 - (2020 - 2026) = 18, clamped to 12
      expect(computePhaseFromGraduationYear(2020)).toBe("senior");
    });
  });
});

// ---------------------------------------------------------------------------
// getYearCompletionMilestones
// ---------------------------------------------------------------------------

describe("getYearCompletionMilestones", () => {
  it("returns 100% when all 4 grades are complete", () => {
    const totalByGrade = { 9: 5, 10: 4, 11: 6, 12: 3 };
    const completedByGrade = { 9: 5, 10: 4, 11: 6, 12: 3 };

    const result = getYearCompletionMilestones(
      totalByGrade,
      completedByGrade,
      "senior",
    );

    expect(result.percentComplete).toBe(100);
    expect(result.completed).toEqual([
      "freshman",
      "sophomore",
      "junior",
      "senior",
    ]);
    expect(result.remaining).toEqual([]);
    expect(result.required).toEqual([
      "freshman",
      "sophomore",
      "junior",
      "senior",
    ]);
  });

  it("returns 0% when no grades have tasks (empty objects)", () => {
    const result = getYearCompletionMilestones({}, {}, "freshman");

    expect(result.percentComplete).toBe(0);
    expect(result.completed).toEqual([]);
    expect(result.remaining).toEqual([
      "freshman",
      "sophomore",
      "junior",
      "senior",
    ]);
  });

  it("handles mixed completion: grade 9 complete, 10 partial, 11-12 not started", () => {
    const totalByGrade = { 9: 3, 10: 4, 11: 5, 12: 2 };
    const completedByGrade = { 9: 3, 10: 2 };

    const result = getYearCompletionMilestones(
      totalByGrade,
      completedByGrade,
      "sophomore",
    );

    expect(result.percentComplete).toBe(25); // 1 of 4 years complete
    expect(result.completed).toEqual(["freshman"]);
    expect(result.remaining).toEqual(["sophomore", "junior", "senior"]);
  });

  it("does not count a grade with 0 total tasks as completed", () => {
    const totalByGrade = { 9: 0, 10: 3, 11: 0, 12: 0 };
    const completedByGrade = { 9: 0, 10: 3 };

    const result = getYearCompletionMilestones(
      totalByGrade,
      completedByGrade,
      "sophomore",
    );

    // Only grade 10 qualifies (total > 0 && done >= total)
    expect(result.percentComplete).toBe(25);
    expect(result.completed).toEqual(["sophomore"]);
    expect(result.remaining).toEqual(["freshman", "junior", "senior"]);
  });

  it("returns 0% with empty inputs but still has 4 required labels", () => {
    const result = getYearCompletionMilestones({}, {}, "junior");

    expect(result.percentComplete).toBe(0);
    expect(result.required).toHaveLength(4);
    expect(result.required).toEqual([
      "freshman",
      "sophomore",
      "junior",
      "senior",
    ]);
  });

  it("uses the currentPhase param as the returned phase field", () => {
    const result = getYearCompletionMilestones({}, {}, "committed");
    expect(result.phase).toBe("committed");

    const result2 = getYearCompletionMilestones(
      { 9: 1 },
      { 9: 1 },
      "junior",
    );
    expect(result2.phase).toBe("junior");
  });
});

// ---------------------------------------------------------------------------
// NOTE: getTaskCompletionByGrade accepts an `athleteId` parameter but the
// query inside (`supabase.from("task").select("id, grade_level")`) does not
// reference it at all — it fetches ALL tasks regardless of athlete. The
// `athleteId` is effectively a dead parameter. Completion filtering happens
// via the `completedTaskIds` array instead. This may be intentional (the
// function only counts totals vs already-known completions) or a leftover
// from an earlier design that filtered per-athlete.
// ---------------------------------------------------------------------------
