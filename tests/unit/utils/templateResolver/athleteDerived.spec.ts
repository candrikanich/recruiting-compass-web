import { describe, it, expect } from "vitest";
import {
  currentGrade,
  pickHsCoach,
  derivePositions,
} from "~/utils/templateResolver/athleteDerived";

describe("currentGrade", () => {
  it("returns null without a graduation year", () => {
    expect(currentGrade(null)).toBeNull();
    expect(currentGrade(undefined)).toBeNull();
  });

  it("maps grad year to grade in the fall term (Aug+ rolls to next school year)", () => {
    // Sept 2026 → school year ends 2027; a 2028 grad is 12-(2028-2027)=11th.
    const fall = new Date("2026-09-15");
    expect(currentGrade(2028, fall)).toBe(11);
    expect(currentGrade(2027, fall)).toBe(12);
  });

  it("maps grad year to grade in the spring term (pre-Aug uses current year)", () => {
    // Mar 2027 → school year ends 2027; a 2028 grad is 12-(2028-2027)=11th.
    const spring = new Date("2027-03-15");
    expect(currentGrade(2028, spring)).toBe(11);
    expect(currentGrade(2029, spring)).toBe(10);
  });
});

describe("pickHsCoach", () => {
  const now = new Date("2026-09-15"); // school year ends 2027

  it("returns null when no grade-coach fields are set", () => {
    expect(pickHsCoach({}, 2028)).toBeNull();
  });

  it("prefers the coach for the athlete's current grade", () => {
    // 2028 grad in fall 2026 → 11th grade → eleventh_grade_coach.
    const prefs = {
      twelfth_grade_coach: "Coach Twelve",
      eleventh_grade_coach: "Coach Eleven",
      tenth_grade_coach: "Coach Ten",
    };
    expect(pickHsCoach(prefs, 2028)).toBe("Coach Eleven");
  });

  it("falls back to the most-recent grade (12→9) when the current grade is empty", () => {
    const prefs = {
      tenth_grade_coach: "Coach Ten",
      ninth_grade_coach: "Coach Nine",
    };
    // Current grade 11 is empty → 12 empty → falls to 10th.
    expect(pickHsCoach(prefs, 2028)).toBe("Coach Ten");
  });

  it("trims whitespace and ignores blank strings", () => {
    const prefs = {
      eleventh_grade_coach: "  ",
      twelfth_grade_coach: "  Dave Reilly  ",
    };
    expect(pickHsCoach(prefs, 2028)).toBe("Dave Reilly");
  });
});

describe("derivePositions", () => {
  it("returns empty object when no positions and no fallback", () => {
    expect(derivePositions("Baseball", {})).toEqual({});
  });

  it("abbreviates ordered positions into a coach-facing primary/secondary", () => {
    const out = derivePositions("Baseball", {
      positions: ["Shortstop", "Second Base"],
    });
    expect(out.position).toBe("SS/2B");
    expect(out.positionSecondary).toBe("2B");
  });

  it("uses only the primary when a single position is entered", () => {
    const out = derivePositions("Baseball", { positions: ["Shortstop"] });
    expect(out.position).toBe("SS");
    expect(out.positionSecondary).toBeUndefined();
  });

  it("filters blank/non-string entries from the positions array", () => {
    const out = derivePositions("Baseball", {
      positions: ["Shortstop", "", 42, "  "],
    });
    expect(out.position).toBe("SS");
    expect(out.positionSecondary).toBeUndefined();
  });

  it("falls back to the legacy primary_position string", () => {
    const out = derivePositions("Baseball", { primary_position: "Shortstop" });
    expect(out.position).toBe("SS");
  });
});
