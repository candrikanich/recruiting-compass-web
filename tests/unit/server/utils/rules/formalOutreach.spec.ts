import { describe, it, expect, beforeEach } from "vitest";
import { formalOutreachRule } from "~/server/utils/rules/formalOutreach";
import type { RuleContext } from "~/server/utils/rules/index";

describe("formalOutreachRule", () => {
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
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];

      const result = await formalOutreachRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should apply to juniors (grade 11)", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await formalOutreachRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should apply to seniors (grade 12)", async () => {
      mockContext.athlete = { grade_level: 12 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await formalOutreachRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });
  });

  describe("priority school filtering", () => {
    it("should only evaluate priority A and B schools", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
        { id: "school-2", priority: "C" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await formalOutreachRule.evaluate(mockContext);
      // Should only check school-1 (priority A), find no interactions for 30+ days
      expect(result).not.toBeNull();
    });

    it("should return null when no priority schools", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "C" },
        { id: "school-2", priority: "C" },
      ] as unknown[];

      const result = await formalOutreachRule.evaluate(mockContext);
      expect(result).toBeNull();
    });
  });

  describe("interaction frequency", () => {
    it("should return suggestion when no interactions > 30 days", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await formalOutreachRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should return suggestion when avg gap > 30 days", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
        { id: "school-2", priority: "B" },
      ] as unknown[];

      const fortyFiveDaysAgo = new Date();
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: fortyFiveDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await formalOutreachRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should NOT return suggestion when avg gap < 30 days", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];

      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: twentyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await formalOutreachRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should return suggestion if ANY priority school gap > 45 days", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
        { id: "school-2", priority: "A" },
      ] as unknown[];

      const fiftyDaysAgo = new Date();
      fiftyDaysAgo.setDate(fiftyDaysAgo.getDate() - 50);

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-2", // Other school has recent contact
          interaction_date: new Date().toISOString(),
        },
        {
          id: "int-2",
          school_id: "school-1", // This school has old contact
          interaction_date: fiftyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await formalOutreachRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });
  });

  describe("urgency differentiation", () => {
    it("should be medium urgency for juniors", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await formalOutreachRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.urgency).toBe("medium");
    });

    it("should be high urgency for seniors", async () => {
      mockContext.athlete = { grade_level: 12 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await formalOutreachRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.urgency).toBe("high");
    });
  });

  describe("action type", () => {
    it("should return log_interaction action", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await formalOutreachRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.action_type).toBe("log_interaction");
    });
  });

  describe("multiple schools", () => {
    it("should handle multiple priority schools with varying gaps", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
        { id: "school-2", priority: "B" },
        { id: "school-3", priority: "A" },
      ] as unknown[];

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const fortyFiveDaysAgo = new Date();
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: tenDaysAgo.toISOString(),
        },
        {
          id: "int-2",
          school_id: "school-2",
          interaction_date: fortyFiveDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await formalOutreachRule.evaluate(mockContext);
      // Should trigger because school-2 has 45-day gap
      expect(result).not.toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle missing grade_level", async () => {
      mockContext.athlete = {};
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];

      const result = await formalOutreachRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should handle schools with missing priority", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [{ id: "school-1" }] as unknown[];

      const result = await formalOutreachRule.evaluate(mockContext);
      expect(result).toBeNull(); // No priority A/B
    });
  });
});
