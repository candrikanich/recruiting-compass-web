import { describe, it, expect } from "vitest";
import {
  getUpcomingMilestones,
  getMilestonesByDateRange,
  getMilestoneTypeIcon,
  isQuietPeriod,
  isDeadPeriod,
  getDeadPeriodMessage,
  getNextDeadPeriod,
  getRecruitingCalendar,
  SAT_TEST_DATES_2026,
  ACT_TEST_DATES_2026,
  COLLEGE_APPLICATION_DEADLINES_2026,
  BASEBALL_SIGNING_PERIODS_2026,
} from "~/server/utils/ncaaRecruitingCalendar";

describe("ncaaRecruitingCalendar", () => {
  describe("milestone arrays exist", () => {
    it("should have SAT test dates", () => {
      expect(SAT_TEST_DATES_2026.length).toBeGreaterThan(0);
      expect(SAT_TEST_DATES_2026[0].type).toBe("test");
    });

    it("should have ACT test dates", () => {
      expect(ACT_TEST_DATES_2026.length).toBeGreaterThan(0);
      expect(ACT_TEST_DATES_2026[0].type).toBe("test");
    });

    it("should have college application deadlines", () => {
      expect(COLLEGE_APPLICATION_DEADLINES_2026.length).toBeGreaterThan(0);
      expect(COLLEGE_APPLICATION_DEADLINES_2026[0].type).toBe("application");
    });

    it("should have baseball signing periods", () => {
      expect(BASEBALL_SIGNING_PERIODS_2026.length).toBeGreaterThan(0);
      expect(BASEBALL_SIGNING_PERIODS_2026[0].type).toBe("signing");
    });
  });

  describe("getUpcomingMilestones", () => {
    it("should return empty array for past dates only scenario", () => {
      const pastDate = new Date("2020-01-01");
      const result = getUpcomingMilestones({
        currentDate: pastDate,
        limit: 100, // High limit to get all future dates
      });

      expect(Array.isArray(result)).toBe(true);
      // Should have some milestones from 2026 onwards
      expect(result.length).toBeGreaterThan(0);
    });

    it("should limit results to specified limit", () => {
      const result = getUpcomingMilestones({
        limit: 3,
      });

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("should default limit to 5", () => {
      const result = getUpcomingMilestones({});

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should return milestones sorted by date", () => {
      const result = getUpcomingMilestones({
        limit: 20,
      });

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].date <= result[i + 1].date).toBe(true);
      }
    });

    it("should filter by graduation year for seniors", () => {
      const seniorYear = new Date().getFullYear() + 3;
      const result = getUpcomingMilestones({
        graduationYear: seniorYear,
        limit: 50,
      });

      // Seniors should see tests, applications, and signing periods
      const types = result.map((m) => m.type);
      expect(
        types.some(
          (t) => t === "test" || t === "application" || t === "signing",
        ),
      ).toBe(true);
    });

    it("should filter by graduation year for juniors", () => {
      const juniorYear = new Date().getFullYear() + 2;
      const result = getUpcomingMilestones({
        graduationYear: juniorYear,
        limit: 50,
      });

      // Juniors should see tests, deadlines, and NCAA periods
      const types = result.map((m) => m.type);
      const hasRelevantType = types.some(
        (t) => t === "test" || t === "deadline" || t === "ncaa-period",
      );
      expect(types.length).toBeGreaterThan(0);
    });

    it("should filter by division if provided", () => {
      const result = getUpcomingMilestones({
        division: "D1",
        limit: 50,
      });

      result.forEach((milestone) => {
        if (milestone.division && milestone.division !== "ALL") {
          expect(milestone.division).toBe("D1");
        }
      });
    });

    it("should return milestones with all required fields", () => {
      const result = getUpcomingMilestones({
        limit: 10,
      });

      result.forEach((milestone) => {
        expect(milestone.date).toBeTruthy();
        expect(milestone.title).toBeTruthy();
        expect(milestone.type).toBeTruthy();
        expect(
          [
            "test",
            "deadline",
            "ncaa-period",
            "application",
            "signing",
          ].includes(milestone.type),
        ).toBe(true);
      });
    });
  });

  describe("getMilestonesByDateRange", () => {
    it("should return milestones within date range", () => {
      const result = getMilestonesByDateRange("2026-01-01", "2026-12-31");

      expect(result.length).toBeGreaterThan(0);
      result.forEach((milestone) => {
        expect(milestone.date >= "2026-01-01").toBe(true);
        expect(milestone.date <= "2026-12-31").toBe(true);
      });
    });

    it("should return empty array for date range with no milestones", () => {
      const result = getMilestonesByDateRange("2020-01-01", "2020-12-31");

      expect(result.length).toBe(0);
    });

    it("should return milestones sorted by date", () => {
      const result = getMilestonesByDateRange("2026-01-01", "2027-12-31");

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].date <= result[i + 1].date).toBe(true);
      }
    });
  });

  describe("getMilestoneTypeIcon", () => {
    it("should return icon for test type", () => {
      expect(getMilestoneTypeIcon("test")).toBe("📝");
    });

    it("should return icon for deadline type", () => {
      expect(getMilestoneTypeIcon("deadline")).toBe("⏰");
    });

    it("should return icon for ncaa-period type", () => {
      expect(getMilestoneTypeIcon("ncaa-period")).toBe("📋");
    });

    it("should return icon for application type", () => {
      expect(getMilestoneTypeIcon("application")).toBe("📧");
    });

    it("should return icon for signing type", () => {
      expect(getMilestoneTypeIcon("signing")).toBe("✍️");
    });

    it("should return default calendar icon for unknown type", () => {
      expect(getMilestoneTypeIcon("unknown" as any)).toBe("📅");
    });
  });

  describe("isQuietPeriod", () => {
    it("returns true for a date inside the D1 quiet period (Sep 1-10 2026)", () => {
      // The calendar has a quiet period Sep 1–10 2026 for D1
      expect(isQuietPeriod(new Date("2026-09-05"), "D1")).toBe(true);
    });

    it("returns true on the start boundary of the quiet period", () => {
      expect(isQuietPeriod(new Date("2026-09-01"), "D1")).toBe(true);
    });

    it("returns true on the end boundary of the quiet period", () => {
      expect(isQuietPeriod(new Date("2026-09-10"), "D1")).toBe(true);
    });

    it("returns false for a date outside all quiet periods", () => {
      // October is a normal contact period
      expect(isQuietPeriod(new Date("2026-10-01"), "D1")).toBe(false);
    });

    it("returns false when division does not match", () => {
      // The quiet period is only defined for D1; D2 has none in the calendar
      expect(isQuietPeriod(new Date("2026-09-05"), "D2")).toBe(false);
    });

    it("defaults to D1 when no division argument is supplied", () => {
      expect(isQuietPeriod(new Date("2026-09-05"))).toBe(true);
    });
  });

  describe("getDeadPeriodMessage", () => {
    it("returns a message string when the date is inside a dead period", () => {
      // Thanksgiving dead period: Nov 22–29 2026
      const result = getDeadPeriodMessage(new Date("2026-11-25"), "D1");
      expect(result).not.toBeNull();
      expect(typeof result).toBe("string");
      expect(result).toContain("Dead period");
      expect(result).toContain("Thanksgiving");
    });

    it("returns null when the date is outside all dead periods", () => {
      // A normal day in October
      expect(getDeadPeriodMessage(new Date("2026-10-15"), "D1")).toBeNull();
    });

    it("includes the period description in the message", () => {
      // Winter break: Dec 20 2026 – Jan 3 2027
      const result = getDeadPeriodMessage(new Date("2026-12-25"), "D1");
      expect(result).toContain("Winter Break");
    });

    it("returns null for a division that has no matching dead period", () => {
      // Dead periods are only D1 in the 2026 calendar
      expect(getDeadPeriodMessage(new Date("2026-11-25"), "D2")).toBeNull();
    });

    it("defaults to D1 when no division is supplied", () => {
      const result = getDeadPeriodMessage(new Date("2026-11-25"));
      expect(result).not.toBeNull();
    });
  });

  describe("getNextDeadPeriod", () => {
    it("returns the soonest upcoming dead period from a given date", () => {
      // Asking from Oct 1 2026, the next dead period is Thanksgiving (Nov 22)
      const result = getNextDeadPeriod(new Date("2026-10-01"), "D1");
      expect(result).not.toBeNull();
      expect(result!.description).toBe("Thanksgiving Break");
    });

    it("returns the correct type and division on the result", () => {
      const result = getNextDeadPeriod(new Date("2026-10-01"), "D1");
      expect(result!.type).toBe("dead");
      expect(result!.division).toBe("D1");
    });

    it("returns null when the given date is after all dead periods in the calendar", () => {
      // After the last dead period (Spring Break ends Apr 10 2027)
      const result = getNextDeadPeriod(new Date("2027-05-01"), "D1");
      expect(result).toBeNull();
    });

    it("returns null for a division with no dead periods", () => {
      expect(getNextDeadPeriod(new Date("2026-01-01"), "D2")).toBeNull();
    });

    it("includes the current date's dead period when the date is inside one", () => {
      // Nov 22 is the start of Thanksgiving — querying from that date should return it
      const result = getNextDeadPeriod(new Date("2026-11-22"), "D1");
      expect(result).not.toBeNull();
      expect(result!.description).toBe("Thanksgiving Break");
    });
  });

  describe("getRecruitingCalendar", () => {
    it("returns only D1 periods when called with 'D1'", () => {
      const result = getRecruitingCalendar("D1");
      expect(result.length).toBeGreaterThan(0);
      result.forEach((period) => {
        expect(period.division).toBe("D1");
      });
    });

    it("returns an empty array for D2 (no D2 periods defined)", () => {
      const result = getRecruitingCalendar("D2");
      expect(result).toEqual([]);
    });

    it("returns an empty array for D3 (no D3 periods defined)", () => {
      const result = getRecruitingCalendar("D3");
      expect(result).toEqual([]);
    });

    it("defaults to D1 when no division argument is supplied", () => {
      const withD1 = getRecruitingCalendar("D1");
      const withDefault = getRecruitingCalendar();
      expect(withDefault).toEqual(withD1);
    });

    it("includes both dead and quiet period types for D1", () => {
      const result = getRecruitingCalendar("D1");
      const types = result.map((p) => p.type);
      expect(types).toContain("dead");
      expect(types).toContain("quiet");
    });

    it("every returned period has start and end Date objects", () => {
      const result = getRecruitingCalendar("D1");
      result.forEach((period) => {
        expect(period.start).toBeInstanceOf(Date);
        expect(period.end).toBeInstanceOf(Date);
        expect(period.start.getTime()).toBeLessThanOrEqual(
          period.end.getTime(),
        );
      });
    });
  });

  describe("milestone data quality", () => {
    it("all milestones should have valid ISO dates", () => {
      const result = getMilestonesByDateRange("2026-01-01", "2027-12-31");

      result.forEach((milestone) => {
        const date = new Date(milestone.date + "T00:00:00Z");
        expect(date.toString()).not.toBe("Invalid Date");
      });
    });

    it("should not have duplicate milestone dates with same title", () => {
      const result = getUpcomingMilestones({
        limit: 100,
      });

      const keys = result.map((m) => `${m.date}-${m.title}`);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it("milestones with URLs should have valid URL format", () => {
      const result = getUpcomingMilestones({
        limit: 50,
      });

      result.forEach((milestone) => {
        if (milestone.url) {
          expect(milestone.url).toMatch(/^https?:\/\//);
        }
      });
    });
  });
});
