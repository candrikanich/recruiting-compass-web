import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  calculateDeadlineInfo,
  formatDeadlineDate,
} from "~/utils/deadlineHelpers";
import type { DeadlineInfo } from "~/types/timeline";

// `deadline_date` is a date-only DB column ("2026-01-15", no time component).
// Fixtures use that real shape — not full ISO timestamps — so these tests
// actually exercise the UTC-midnight parsing bug this module fixes.
describe("deadlineHelpers", () => {
  beforeEach(() => {
    // Local midnight, Jan 15 2026 — set via local Date parts (not a UTC
    // ISO string) so "today" means the same local day in every TZ.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("calculateDeadlineInfo", () => {
    it("returns 'none' urgency when deadline_date is null", () => {
      const result = calculateDeadlineInfo(null);
      expect(result.urgency).toBe("none");
      expect(result.daysRemaining).toBeNull();
      expect(result.isPastDue).toBe(false);
    });

    it("returns 'critical' and isPastDue true when deadline is in the past", () => {
      const result = calculateDeadlineInfo("2026-01-10");
      expect(result.urgency).toBe("critical");
      expect(result.isPastDue).toBe(true);
      expect(result.daysRemaining).toBeLessThan(0);
    });

    it("returns 'critical' when deadline is today", () => {
      const result = calculateDeadlineInfo("2026-01-15");
      expect(result.urgency).toBe("critical");
      expect(result.isPastDue).toBe(false);
      expect(result.daysRemaining).toBe(0);
    });

    it("returns 'critical' when deadline is within 3 days", () => {
      const result = calculateDeadlineInfo("2026-01-18");
      expect(result.urgency).toBe("critical");
      expect(result.isPastDue).toBe(false);
      expect(result.daysRemaining).toBe(3);
    });

    it("returns 'urgent' when deadline is 4-7 days away", () => {
      const result = calculateDeadlineInfo("2026-01-20");
      expect(result.urgency).toBe("urgent");
      expect(result.isPastDue).toBe(false);
      expect(result.daysRemaining).toBe(5);
    });

    it("returns 'upcoming' when deadline is 8-14 days away", () => {
      const result = calculateDeadlineInfo("2026-01-25");
      expect(result.urgency).toBe("upcoming");
      expect(result.isPastDue).toBe(false);
      expect(result.daysRemaining).toBe(10);
    });

    it("returns 'future' when deadline is more than 14 days away", () => {
      const result = calculateDeadlineInfo("2026-02-14");
      expect(result.urgency).toBe("future");
      expect(result.isPastDue).toBe(false);
      expect(result.daysRemaining).toBe(30);
    });

    it("returns correct urgency colors", () => {
      expect(calculateDeadlineInfo("2026-01-17").urgencyColor).toBe("red");
      expect(calculateDeadlineInfo("2026-01-20").urgencyColor).toBe("orange");
      expect(calculateDeadlineInfo("2026-01-25").urgencyColor).toBe("yellow");
      expect(calculateDeadlineInfo("2026-02-14").urgencyColor).toBe("gray");
    });

    it("returns correct urgency labels", () => {
      expect(calculateDeadlineInfo(null).urgencyLabel).toBe("");
      expect(calculateDeadlineInfo("2026-01-15").urgencyLabel).toBe(
        "Due Today",
      );
      expect(calculateDeadlineInfo("2026-01-16").urgencyLabel).toBe(
        "Due Tomorrow",
      );
    });
  });

  describe("formatDeadlineDate", () => {
    it("returns empty string when deadline_date is null", () => {
      const result = formatDeadlineDate(null);
      expect(result).toBe("");
    });

    it("returns 'Today' for deadline on current date", () => {
      expect(formatDeadlineDate("2026-01-15")).toBe("Today");
    });

    it("returns 'Tomorrow' for deadline on next day", () => {
      expect(formatDeadlineDate("2026-01-16")).toBe("Tomorrow");
    });

    it("returns 'Overdue' for past dates", () => {
      expect(formatDeadlineDate("2026-01-10")).toBe("Overdue");
    });

    it("returns formatted date for dates more than 2 days away", () => {
      expect(formatDeadlineDate("2026-02-14")).toMatch(/Feb 14/);
    });

    it("formats date with month and day", () => {
      expect(formatDeadlineDate("2026-12-25")).toMatch(/Dec 25/);
    });
  });

  describe("integration", () => {
    it("calculateDeadlineInfo and formatDeadlineDate work together", () => {
      const info = calculateDeadlineInfo("2026-01-15");
      const formatted = formatDeadlineDate("2026-01-15");

      expect(info.urgency).toBe("critical");
      expect(info.urgencyColor).toBe("red");
      expect(formatted).toBe("Today");
    });
  });

  describe("non-UTC timezone regression (the 'day early' bug)", () => {
    const originalTz = process.env.TZ;

    afterEach(() => {
      process.env.TZ = originalTz;
    });

    it.each(["America/New_York", "America/Los_Angeles"])(
      "a deadline due today is never reported 'Overdue' the prior evening, in %s",
      (tz) => {
        process.env.TZ = tz;
        vi.setSystemTime(new Date(2026, 0, 15, 22, 0)); // 10pm local, still the 15th
        expect(formatDeadlineDate("2026-01-15")).toBe("Today");
        expect(calculateDeadlineInfo("2026-01-15").isPastDue).toBe(false);
      },
    );

    it.each(["America/New_York", "America/Los_Angeles"])(
      "renders the stored calendar day, not a day early, in %s",
      (tz) => {
        process.env.TZ = tz;
        vi.setSystemTime(new Date(2026, 0, 1, 12, 0));
        expect(formatDeadlineDate("2026-02-14")).toMatch(/Feb 14/);
        expect(formatDeadlineDate("2026-02-14")).not.toMatch(/Feb 13/);
      },
    );
  });
});
