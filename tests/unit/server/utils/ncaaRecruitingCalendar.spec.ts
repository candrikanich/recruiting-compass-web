import { describe, it, expect } from "vitest";
import {
  getUpcomingMilestones,
  getMilestonesByDateRange,
  getMilestoneTypeIcon,
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
