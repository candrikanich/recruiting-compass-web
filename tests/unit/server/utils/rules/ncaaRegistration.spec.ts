import { describe, it, expect, beforeEach } from "vitest";
import { ncaaRegistrationRule } from "~/server/utils/rules/ncaaRegistration";
import type { RuleContext } from "~/server/utils/rules/index";

describe("ncaaRegistrationRule", () => {
  let mockContext: RuleContext;

  beforeEach(() => {
    mockContext = {
      athleteId: "athlete-123",
      athlete: { grade_level: 11 },
      schools: [],
      interactions: [],
      tasks: [],
      athleteTasks: [],
      videos: [],
      events: [],
    };
  });

  describe("grade level filtering", () => {
    it("should NOT apply to sophomores (grade 10)", async () => {
      mockContext.athlete = { grade_level: 10 };
      mockContext.schools = [{ id: "school-1", division: "DI" }] as unknown[];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should apply to juniors (grade 11)", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1", division: "DI" }] as unknown[];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should NOT apply to seniors (grade 12)", async () => {
      mockContext.athlete = { grade_level: 12 };
      mockContext.schools = [{ id: "school-1", division: "DI" }] as unknown[];

      // Note: Rule only targets juniors, not seniors (they should already be registered)
      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).toBeNull();
    });
  });

  describe("division filtering", () => {
    it("should only apply if DI schools in list", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1", division: "DI" }] as unknown[];
      mockContext.athleteTasks = [];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should only apply if DII schools in list", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1", division: "DII" }] as unknown[];
      mockContext.athleteTasks = [];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should NOT apply if only DIII schools", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1", division: "DIII" }] as unknown[];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should NOT apply if only NAIA schools", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1", division: "NAIA" }] as unknown[];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should apply if mix includes DI", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", division: "DIII" },
        { id: "school-2", division: "DI" },
      ] as unknown[];
      mockContext.athleteTasks = [];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });
  });

  describe("NCAA registration task completion", () => {
    it("should return suggestion when NCAA task not completed", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1", division: "DI" }] as unknown[];
      mockContext.athleteTasks = [];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should NOT return suggestion when NCAA task completed", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1", division: "DI" }] as unknown[];
      mockContext.athleteTasks = [
        {
          task_id: "task-11-a3",
          athlete_id: "athlete-123",
          status: "completed",
        },
      ] as unknown[];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should NOT return suggestion when task exists but not completed", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1", division: "DI" }] as unknown[];
      mockContext.athleteTasks = [
        {
          task_id: "task-11-a3",
          athlete_id: "athlete-123",
          status: "in_progress",
        },
      ] as unknown[];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).not.toBeNull(); // Still not completed
    });
  });

  describe("urgency", () => {
    it("should always be high urgency", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1", division: "DI" }] as unknown[];
      mockContext.athleteTasks = [];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.urgency).toBe("high");
    });
  });

  describe("action type", () => {
    it("should return log_interaction action", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1", division: "DI" }] as unknown[];
      mockContext.athleteTasks = [];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.action_type).toBe("log_interaction");
    });
  });

  describe("edge cases", () => {
    it("should handle missing grade_level", async () => {
      mockContext.athlete = {};
      mockContext.schools = [{ id: "school-1", division: "DI" }] as unknown[];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).toBeNull(); // Defaults to grade 9
    });

    it("should handle empty school list", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [];

      const result = await ncaaRegistrationRule.evaluate(mockContext);
      expect(result).toBeNull(); // No DI/DII schools
    });
  });
});
