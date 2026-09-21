import { describe, it, expect } from "vitest";
import {
  getGraduationYearOptions,
  GRAD_YEARS_AHEAD,
} from "~/utils/graduationYears";

describe("getGraduationYearOptions", () => {
  it("returns current year through current year + 5 (inclusive)", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    expect(getGraduationYearOptions(now)).toEqual([
      2026, 2027, 2028, 2029, 2030, 2031,
    ]);
  });

  it("includes rising 8th graders (grad year = current + 5)", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    const options = getGraduationYearOptions(now);
    expect(options).toContain(now.getUTCFullYear() + GRAD_YEARS_AHEAD);
    expect(options).toHaveLength(GRAD_YEARS_AHEAD + 1);
  });

  it("still includes the just-graduated class through June (floor = current year)", () => {
    const now = new Date("2026-06-30T23:59:59Z");
    expect(getGraduationYearOptions(now)).toEqual([
      2026, 2027, 2028, 2029, 2030, 2031,
    ]);
  });

  it("drops the just-graduated class from July 1 (floor rolls to current year + 1)", () => {
    const now = new Date("2026-07-01T00:00:00Z");
    expect(getGraduationYearOptions(now)).toEqual([2027, 2028, 2029, 2030, 2031]);
  });

  it("keeps the ceiling pinned to calendarYear + 5 after the July pivot (window shrinks, doesn't slide)", () => {
    const now = new Date("2026-12-01T00:00:00Z");
    const options = getGraduationYearOptions(now);
    expect(options[0]).toBe(2027);
    expect(options[options.length - 1]).toBe(2026 + GRAD_YEARS_AHEAD);
  });

  it("defaults to a July-1-pivoted current year when no date passed", () => {
    const options = getGraduationYearOptions();
    const now = new Date();
    const expectedFloor =
      now.getUTCMonth() + 1 >= 7 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
    expect(options[0]).toBe(expectedFloor);
  });

  it("pivots on the UTC instant, not the runner's local timezone (client/server parity)", () => {
    // 2026-06-30T20:00 in UTC-08 is 2026-07-01T04:00Z — already past the July 1 UTC
    // pivot. A local-time implementation reading -08:00's calendar would see June 30
    // and disagree with the server, which always evaluates the same instant in UTC.
    const now = new Date("2026-06-30T20:00:00-08:00");
    expect(getGraduationYearOptions(now)).toEqual([2027, 2028, 2029, 2030, 2031]);
  });
});
