import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateCurrentGrade } from "~/utils/gradeHelpers";

describe("gradeHelpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe("calculateCurrentGrade", () => {
    it("returns grade 12 for senior year (graduation year is next year)", () => {
      vi.setSystemTime(new Date("2026-10-01T12:00:00Z")); // October (school year started Sept 2026)
      const result = calculateCurrentGrade(2027); // Graduating June 2027
      expect(result).toBe(12);
    });

    it("returns grade 11 for junior year", () => {
      vi.setSystemTime(new Date("2026-10-01T12:00:00Z")); // October (school year started Sept 2026)
      const result = calculateCurrentGrade(2028); // Graduating June 2028
      expect(result).toBe(11);
    });

    it("returns grade 10 for sophomore year", () => {
      vi.setSystemTime(new Date("2026-10-01T12:00:00Z")); // October
      const result = calculateCurrentGrade(2029); // Graduating June 2029
      expect(result).toBe(10);
    });

    it("returns grade 9 for freshman year", () => {
      vi.setSystemTime(new Date("2026-10-01T12:00:00Z")); // October
      const result = calculateCurrentGrade(2030); // Graduating June 2030
      expect(result).toBe(9);
    });

    it("returns grade based on current school year (January - August = previous school year)", () => {
      vi.setSystemTime(new Date("2026-01-15T12:00:00Z")); // January (in school year 2025-2026)
      const result = calculateCurrentGrade(2027); // Graduating June 2027 (junior year ends June 2027)
      expect(result).toBe(11);
    });

    it("returns grade based on current school year (September = new school year)", () => {
      vi.setSystemTime(new Date("2026-09-15T12:00:00Z")); // September (new school year 2026-2027 starts)
      const result = calculateCurrentGrade(2028); // Graduating June 2028
      expect(result).toBe(11);
    });

    it("caps grade at maximum of 12", () => {
      vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
      const result = calculateCurrentGrade(2025); // Graduation year in the past
      expect(result).toBeLessThanOrEqual(12);
    });

    it("caps grade at minimum of 9", () => {
      vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
      const result = calculateCurrentGrade(2050); // Graduation year far in future
      expect(result).toBeGreaterThanOrEqual(9);
    });

    it("handles typical scenario: February 2026, graduating 2027 (junior)", () => {
      vi.setSystemTime(new Date("2026-02-01T12:00:00Z")); // Jan-Aug uses current year as end year
      const result = calculateCurrentGrade(2027); // Graduating June 2027
      expect(result).toBe(11); // Junior in 2025-2026 school year
    });

    it("handles typical scenario: October 2026, graduating 2028 (junior)", () => {
      vi.setSystemTime(new Date("2026-10-01T12:00:00Z")); // Sept-Dec uses next year as end year
      const result = calculateCurrentGrade(2028); // Graduating June 2028
      expect(result).toBe(11); // Junior in 2026-2027 school year
    });

    it("handles typical scenario: October 2026, graduating 2027 (senior)", () => {
      vi.setSystemTime(new Date("2026-10-01T12:00:00Z")); // Sept-Dec uses next year as end year
      const result = calculateCurrentGrade(2027); // Graduating June 2027
      expect(result).toBe(12); // Senior in 2026-2027 school year
    });
  });
});
