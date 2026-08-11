import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseLocalDateOnly,
  formatLocalDateOnly,
  getLocalToday,
  isSameLocalDay,
  compareDateOnlyStrings,
  daysBetweenDateOnlyStrings,
  exclusiveEndOfDay,
} from "~/utils/localDate";

// This bug class only manifests in timezones behind UTC (which is every US
// timezone). Run the full assertion set under two distinct US zones so a
// regression that only "accidentally" works in one zone can't hide.
const TIMEZONES = ["America/New_York", "America/Los_Angeles"] as const;

describe.each(TIMEZONES)("localDate utilities (TZ=%s)", (tz) => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = tz;
  });

  afterEach(() => {
    process.env.TZ = originalTz;
    vi.useRealTimers();
  });

  describe("parseLocalDateOnly", () => {
    it("parses a date-only string to local midnight, not UTC midnight", () => {
      const parsed = parseLocalDateOnly("2027-12-01");
      // The bug: `new Date("2027-12-01")` parses as UTC midnight, which in
      // any US timezone rolls back to Nov 30 local. Assert the LOCAL date
      // parts are exactly what was requested.
      expect(parsed.getFullYear()).toBe(2027);
      expect(parsed.getMonth()).toBe(11); // December, 0-indexed
      expect(parsed.getDate()).toBe(1);
      expect(parsed.getHours()).toBe(0);
    });

    it("does not roll back to the previous day (the regression this fixes)", () => {
      // `new Date("2027-12-01")` is the buggy pattern this whole module
      // exists to replace — prove our parser disagrees with it.
      const buggy = new Date("2027-12-01");
      const fixed = parseLocalDateOnly("2027-12-01");
      expect(fixed.getDate()).toBe(1);
      // In UTC-behind zones the buggy parse shows Nov 30; document the
      // divergence directly so the fix is unambiguous.
      expect(buggy.getDate()).not.toBe(fixed.getDate());
    });

    it("tolerates a leading date-only prefix on a full ISO timestamp", () => {
      const parsed = parseLocalDateOnly("2026-01-10T12:00:00.000Z");
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(0);
      expect(parsed.getDate()).toBe(10);
    });

    it("throws for a malformed date-only string", () => {
      expect(() => parseLocalDateOnly("not-a-date")).toThrow();
    });
  });

  describe("formatLocalDateOnly", () => {
    it("round-trips a local date back to YYYY-MM-DD", () => {
      const date = new Date(2027, 0, 5); // Jan 5, local
      expect(formatLocalDateOnly(date)).toBe("2027-01-05");
    });

    it("pads single-digit month and day", () => {
      const date = new Date(2027, 8, 3); // Sep 3
      expect(formatLocalDateOnly(date)).toBe("2027-09-03");
    });
  });

  describe("getLocalToday", () => {
    it("derives today from local date parts, not toISOString (UTC)", () => {
      vi.useFakeTimers();
      // 11pm US-Eastern on Jan 15 is already Jan 16 UTC. A UTC-anchored
      // "today" would drift to the 16th; local parts must stay the 15th.
      vi.setSystemTime(new Date("2026-01-16T04:00:00.000Z"));
      const today = getLocalToday();
      // Compute independently via local Date parts to avoid a tautological
      // assertion against the same helper under test.
      const now = new Date();
      expect(today.getFullYear()).toBe(now.getFullYear());
      expect(today.getMonth()).toBe(now.getMonth());
      expect(today.getDate()).toBe(now.getDate());
      expect(today.getHours()).toBe(0);
    });
  });

  describe("isSameLocalDay", () => {
    it("treats a date-only value at local midnight as 'today' all day long", () => {
      vi.useFakeTimers();
      // Late evening local time — the historical UTC-toISOString bug
      // treated this as "tomorrow" and dropped today's items.
      vi.setSystemTime(new Date(2026, 0, 15, 23, 30));
      const todayDeadline = parseLocalDateOnly(formatLocalDateOnly(new Date()));
      expect(isSameLocalDay(todayDeadline)).toBe(true);
    });

    it("returns false for a different day", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 15, 12, 0));
      const other = parseLocalDateOnly("2026-01-16");
      expect(isSameLocalDay(other)).toBe(false);
    });
  });

  describe("compareDateOnlyStrings", () => {
    it("returns 0 for the same calendar day", () => {
      expect(compareDateOnlyStrings("2027-03-01", "2027-03-01")).toBe(0);
    });

    it("returns negative when the first date is earlier", () => {
      expect(compareDateOnlyStrings("2027-03-01", "2027-03-02")).toBeLessThan(
        0,
      );
    });

    it("returns positive when the first date is later", () => {
      expect(
        compareDateOnlyStrings("2027-03-05", "2027-03-02"),
      ).toBeGreaterThan(0);
    });
  });

  describe("exclusiveEndOfDay", () => {
    it("returns local midnight of the NEXT calendar day", () => {
      const bound = exclusiveEndOfDay("2027-06-10");
      expect(bound.getFullYear()).toBe(2027);
      expect(bound.getMonth()).toBe(5);
      expect(bound.getDate()).toBe(11);
      expect(bound.getHours()).toBe(0);
    });

    it("used as an exclusive upper bound includes the entire end day", () => {
      const bound = exclusiveEndOfDay("2027-06-10");
      const endOfEndDay = new Date(2027, 5, 10, 23, 59, 59, 999);
      expect(endOfEndDay.getTime()).toBeLessThan(bound.getTime());
    });

    it("rolls over month/year boundaries correctly", () => {
      const bound = exclusiveEndOfDay("2027-12-31");
      expect(bound.getFullYear()).toBe(2028);
      expect(bound.getMonth()).toBe(0);
      expect(bound.getDate()).toBe(1);
    });
  });

  // NOTE: the implementation returns `a - b` days (comparator-consistent with
  // compareDateOnlyStrings, which returns <0 when `a` is earlier). The JSDoc on
  // daysBetweenDateOnlyStrings says "b minus a" — that comment is inaccurate;
  // these assertions pin the actual behavior.
  describe("daysBetweenDateOnlyStrings", () => {
    it("returns a negative count when the first date is earlier", () => {
      expect(daysBetweenDateOnlyStrings("2027-06-10", "2027-06-13")).toBe(-3);
    });

    it("returns a positive count when the first date is later", () => {
      expect(daysBetweenDateOnlyStrings("2027-06-13", "2027-06-10")).toBe(3);
    });

    it("is zero for the same day", () => {
      expect(daysBetweenDateOnlyStrings("2027-06-10", "2027-06-10")).toBe(0);
    });

    it("counts across a month boundary", () => {
      expect(daysBetweenDateOnlyStrings("2027-07-01", "2027-06-28")).toBe(3);
    });
  });
});
