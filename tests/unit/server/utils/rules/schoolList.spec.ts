import { describe, it, expect, beforeEach } from "vitest";
import { schoolListRule } from "~/server/utils/rules/schoolList";
import type { RuleContext } from "~/server/utils/rules/index";

describe("schoolListRule", () => {
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
      mockContext.schools = Array(10).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should apply to sophomores (grade 10)", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.schools = Array(10).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should apply to juniors (grade 11)", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = Array(10).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should NOT apply to seniors (grade 12)", async () => {
      mockContext.athlete = { grade_level: 12 };
      mockContext.schools = Array(10).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      expect(result).toBeNull();
    });
  });

  describe("school count threshold", () => {
    it("should return suggestion when < 20 schools (freshman equivalent)", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.schools = Array(15).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      expect(result).not.toBeNull();
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.message).toContain("15");
    });

    it("should return suggestion when exactly 1 school", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.schools = [{ id: "school-1" }];

      const result = await schoolListRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should NOT return suggestion when >= 20 schools", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.schools = Array(20).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should NOT return suggestion when 25 schools (above target)", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.schools = Array(25).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      expect(result).toBeNull();
    });
  });

  describe("urgency differentiation", () => {
    it("should be medium urgency for sophomores < 20 schools", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.schools = Array(15).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.urgency).toBe("medium");
    });

    it("should be high urgency for juniors < 20 schools", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = Array(15).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.urgency).toBe("high");
    });
  });

  describe("action type", () => {
    it("should return add_school action", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.schools = Array(10).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.action_type).toBe("add_school");
    });
  });

  describe("rule metadata", () => {
    it("should have correct rule_type", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.schools = Array(10).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.rule_type).toBe("school-list-building");
    });
  });

  describe("edge cases", () => {
    it("should handle missing grade_level (defaults to 9)", async () => {
      mockContext.athlete = {};
      mockContext.schools = Array(10).fill({ id: "school" });

      const result = await schoolListRule.evaluate(mockContext);
      expect(result).toBeNull(); // Grade 9 should not trigger
    });

    it("should handle empty school list", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.schools = [];

      const result = await schoolListRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });
  });
});
