import { describe, it, expect, beforeEach } from "vitest";
import { showcaseAttendanceRule } from "~/server/utils/rules/showcaseAttendance";
import type { RuleContext } from "~/server/utils/rules/index";

describe("showcaseAttendanceRule", () => {
  let mockContext: RuleContext;

  beforeEach(() => {
    mockContext = {
      athleteId: "athlete-123",
      athlete: { grade_level: 10 },
      schools: [],
      interactions: [],
      tasks: [],
      athleteTasks: [],
      videos: [],
      events: [],
    };
  });

  describe("grade level filtering", () => {
    it("should NOT apply to freshmen (grade 9)", async () => {
      mockContext.athlete = { grade_level: 9 };
      const result = await showcaseAttendanceRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should apply to sophomores (grade 10)", async () => {
      mockContext.athlete = { grade_level: 10 };
      const result = await showcaseAttendanceRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should NOT apply to juniors (grade 11)", async () => {
      mockContext.athlete = { grade_level: 11 };
      const result = await showcaseAttendanceRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should NOT apply to seniors (grade 12)", async () => {
      mockContext.athlete = { grade_level: 12 };
      const result = await showcaseAttendanceRule.evaluate(mockContext);
      expect(result).toBeNull();
    });
  });

  describe("event attendance", () => {
    it("should return suggestion when no events exist", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.events = [];

      const result = await showcaseAttendanceRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should return suggestion when last event > 6 months ago", async () => {
      mockContext.athlete = { grade_level: 10 };
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      mockContext.events = [
        {
          id: "event-1",
          event_date: sevenMonthsAgo.toISOString(),
        },
      ] as unknown[];

      const result = await showcaseAttendanceRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should NOT return suggestion when recent event < 6 months", async () => {
      mockContext.athlete = { grade_level: 10 };
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      mockContext.events = [
        {
          id: "event-1",
          event_date: threeMonthsAgo.toISOString(),
        },
      ] as unknown[];

      const result = await showcaseAttendanceRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should NOT return suggestion when event exactly 6 months ago", async () => {
      mockContext.athlete = { grade_level: 10 };
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      mockContext.events = [
        {
          id: "event-1",
          event_date: sixMonthsAgo.toISOString(),
        },
      ] as unknown[];

      const result = await showcaseAttendanceRule.evaluate(mockContext);
      expect(result).toBeNull();
    });
  });

  describe("multiple events", () => {
    it("should use most recent event date", async () => {
      mockContext.athlete = { grade_level: 10 };
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      mockContext.events = [
        { id: "event-1", event_date: oneYearAgo.toISOString() },
        { id: "event-2", event_date: threeMonthsAgo.toISOString() },
      ] as unknown[];

      const result = await showcaseAttendanceRule.evaluate(mockContext);
      // Recent event is 3 months, so no suggestion
      expect(result).toBeNull();
    });
  });

  describe("urgency", () => {
    it("should always be medium urgency", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.events = [];

      const result = await showcaseAttendanceRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.urgency).toBe("medium");
    });
  });

  describe("action type", () => {
    it("should return log_interaction action", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.events = [];

      const result = await showcaseAttendanceRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.action_type).toBe("log_interaction");
    });
  });

  describe("edge cases", () => {
    it("should handle missing grade_level", async () => {
      mockContext.athlete = {};
      const result = await showcaseAttendanceRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should handle events with missing event_date", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.events = [{ id: "event-1" }] as unknown[];

      const result = await showcaseAttendanceRule.evaluate(mockContext);
      expect(result).not.toBeNull(); // Should treat as no valid event
    });
  });
});
