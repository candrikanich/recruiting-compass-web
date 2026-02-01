import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateDeadlineInfo,
  formatDeadlineDate,
} from "~/utils/deadlineHelpers";
import type { DeadlineInfo } from "~/types/timeline";

describe("deadlineHelpers", () => {
  beforeEach(() => {
    // Mock current date to 2026-01-15 for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  describe("calculateDeadlineInfo", () => {
    it("returns 'none' urgency when deadline_date is null", () => {
      const result = calculateDeadlineInfo(null);
      expect(result.urgency).toBe("none");
      expect(result.daysRemaining).toBeNull();
      expect(result.isPastDue).toBe(false);
    });

    it("returns 'critical' and isPastDue true when deadline is in the past", () => {
      const pastDate = new Date("2026-01-10T12:00:00Z").toISOString();
      const result = calculateDeadlineInfo(pastDate);
      expect(result.urgency).toBe("critical");
      expect(result.isPastDue).toBe(true);
      expect(result.daysRemaining).toBeLessThan(0);
    });

    it("returns 'critical' when deadline is today", () => {
      const today = new Date("2026-01-15T12:00:00Z").toISOString();
      const result = calculateDeadlineInfo(today);
      expect(result.urgency).toBe("critical");
      expect(result.isPastDue).toBe(false);
      expect(result.daysRemaining).toBe(0);
    });

    it("returns 'critical' when deadline is within 3 days", () => {
      const threeDaysFromNow = new Date("2026-01-18T12:00:00Z").toISOString();
      const result = calculateDeadlineInfo(threeDaysFromNow);
      expect(result.urgency).toBe("critical");
      expect(result.isPastDue).toBe(false);
      expect(result.daysRemaining).toBe(3);
    });

    it("returns 'urgent' when deadline is 4-7 days away", () => {
      const fiveDaysFromNow = new Date("2026-01-20T12:00:00Z").toISOString();
      const result = calculateDeadlineInfo(fiveDaysFromNow);
      expect(result.urgency).toBe("urgent");
      expect(result.isPastDue).toBe(false);
      expect(result.daysRemaining).toBe(5);
    });

    it("returns 'upcoming' when deadline is 8-14 days away", () => {
      const tenDaysFromNow = new Date("2026-01-25T12:00:00Z").toISOString();
      const result = calculateDeadlineInfo(tenDaysFromNow);
      expect(result.urgency).toBe("upcoming");
      expect(result.isPastDue).toBe(false);
      expect(result.daysRemaining).toBe(10);
    });

    it("returns 'future' when deadline is more than 14 days away", () => {
      const thirtyDaysFromNow = new Date("2026-02-14T12:00:00Z").toISOString();
      const result = calculateDeadlineInfo(thirtyDaysFromNow);
      expect(result.urgency).toBe("future");
      expect(result.isPastDue).toBe(false);
      expect(result.daysRemaining).toBe(30);
    });

    it("returns correct urgency colors", () => {
      const criticalDate = new Date("2026-01-17T12:00:00Z").toISOString();
      const urgentDate = new Date("2026-01-20T12:00:00Z").toISOString();
      const upcomingDate = new Date("2026-01-25T12:00:00Z").toISOString();
      const futureDate = new Date("2026-02-14T12:00:00Z").toISOString();

      expect(calculateDeadlineInfo(criticalDate).urgencyColor).toBe("red");
      expect(calculateDeadlineInfo(urgentDate).urgencyColor).toBe("orange");
      expect(calculateDeadlineInfo(upcomingDate).urgencyColor).toBe("yellow");
      expect(calculateDeadlineInfo(futureDate).urgencyColor).toBe("gray");
    });

    it("returns correct urgency labels", () => {
      expect(calculateDeadlineInfo(null).urgencyLabel).toBe("");
      expect(
        calculateDeadlineInfo(new Date("2026-01-15T12:00:00Z").toISOString())
          .urgencyLabel,
      ).toBe("Due Today");
      expect(
        calculateDeadlineInfo(new Date("2026-01-16T12:00:00Z").toISOString())
          .urgencyLabel,
      ).toBe("Due Tomorrow");
    });
  });

  describe("formatDeadlineDate", () => {
    it("returns empty string when deadline_date is null", () => {
      const result = formatDeadlineDate(null);
      expect(result).toBe("");
    });

    it("returns 'Today' for deadline on current date", () => {
      const today = new Date("2026-01-15T12:00:00Z").toISOString();
      const result = formatDeadlineDate(today);
      expect(result).toBe("Today");
    });

    it("returns 'Tomorrow' for deadline on next day", () => {
      const tomorrow = new Date("2026-01-16T12:00:00Z").toISOString();
      const result = formatDeadlineDate(tomorrow);
      expect(result).toBe("Tomorrow");
    });

    it("returns 'Overdue' for past dates", () => {
      const pastDate = new Date("2026-01-10T12:00:00Z").toISOString();
      const result = formatDeadlineDate(pastDate);
      expect(result).toBe("Overdue");
    });

    it("returns formatted date for dates more than 2 days away", () => {
      const futureDate = new Date("2026-02-14T12:00:00Z").toISOString();
      const result = formatDeadlineDate(futureDate);
      expect(result).toMatch(/Feb 14/);
    });

    it("formats date with month and day", () => {
      const date = new Date("2026-12-25T12:00:00Z").toISOString();
      const result = formatDeadlineDate(date);
      expect(result).toMatch(/Dec 25/);
    });
  });

  describe("integration", () => {
    it("calculateDeadlineInfo and formatDeadlineDate work together", () => {
      const criticalDate = new Date("2026-01-15T12:00:00Z").toISOString();
      const info = calculateDeadlineInfo(criticalDate);
      const formatted = formatDeadlineDate(criticalDate);

      expect(info.urgency).toBe("critical");
      expect(info.urgencyColor).toBe("red");
      expect(formatted).toBe("Today");
    });
  });
});
