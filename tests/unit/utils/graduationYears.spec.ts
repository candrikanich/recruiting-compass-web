import { describe, it, expect } from "vitest";
import {
  getGraduationYearOptions,
  GRAD_YEARS_AHEAD,
} from "~/utils/graduationYears";

describe("getGraduationYearOptions", () => {
  it("returns current year through current year + 5 (inclusive)", () => {
    const now = new Date("2026-03-01T00:00:00");
    expect(getGraduationYearOptions(now)).toEqual([
      2026, 2027, 2028, 2029, 2030, 2031,
    ]);
  });

  it("includes rising 8th graders (grad year = current + 5)", () => {
    const now = new Date("2026-03-01T00:00:00");
    const options = getGraduationYearOptions(now);
    expect(options).toContain(now.getFullYear() + GRAD_YEARS_AHEAD);
    expect(options).toHaveLength(GRAD_YEARS_AHEAD + 1);
  });

  it("defaults to the real current year when no date passed", () => {
    const options = getGraduationYearOptions();
    expect(options[0]).toBe(new Date().getFullYear());
  });
});
