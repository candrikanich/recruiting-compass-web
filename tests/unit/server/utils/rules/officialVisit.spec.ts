import { describe, it, expect, beforeEach } from "vitest";
import { officialVisitRule } from "~/server/utils/rules/officialVisit";
import type { RuleContext } from "~/server/utils/rules/index";

describe("officialVisitRule", () => {
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

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should apply to juniors (grade 11)", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should apply to seniors (grade 12)", async () => {
      mockContext.athlete = { grade_level: 12 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });
  });

  describe("priority school requirement", () => {
    it("should return null when no priority A/B schools", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "C" },
        { id: "school-2", priority: "C" },
      ] as unknown[];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should evaluate when priority A schools exist", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should evaluate when priority B schools exist", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "B" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });
  });

  describe("official visit tracking", () => {
    it("should return suggestion when 0 visits logged", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should return suggestion when 1 visit logged", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [
        {
          id: "int-1",
          interaction_type: "official_visit",
        },
      ] as unknown[];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).not.toBeNull();
    });

    it("should NOT return suggestion when 2+ visits logged", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [
        { id: "int-1", interaction_type: "official_visit" },
        { id: "int-2", interaction_type: "official_visit" },
      ] as unknown[];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should match visit-related interaction types (case insensitive)", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [
        { id: "int-1", interaction_type: "Campus Visit" },
        { id: "int-2", interaction_type: "OFFICIAL" },
      ] as unknown[];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).toBeNull(); // 2 matches found
    });

    it("should distinguish official visits from regular interactions", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [
        { id: "int-1", interaction_type: "email" },
        { id: "int-2", interaction_type: "phone_call" },
        { id: "int-3", interaction_type: "official_visit" },
      ] as unknown[];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).not.toBeNull(); // Only 1 official visit
    });
  });

  describe("urgency differentiation", () => {
    it("should be medium urgency for juniors", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await officialVisitRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.urgency).toBe("medium");
    });

    it("should be high urgency for seniors", async () => {
      mockContext.athlete = { grade_level: 12 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await officialVisitRule.evaluate(mockContext);
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

      const result = await officialVisitRule.evaluate(mockContext);
      const suggestion = result as Record<string, unknown>;
      expect(suggestion.action_type).toBe("log_interaction");
    });
  });

  describe("edge cases", () => {
    it("should handle missing grade_level", async () => {
      mockContext.athlete = {};
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should handle empty schools list", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should handle interactions with missing interaction_type", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
      ] as unknown[];
      mockContext.interactions = [
        { id: "int-1" }, // No interaction_type
      ] as unknown[];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).not.toBeNull(); // Should treat as non-visit
    });
  });

  describe("multiple schools with priority", () => {
    it("should process multiple priority schools correctly", async () => {
      mockContext.athlete = { grade_level: 11 };
      mockContext.schools = [
        { id: "school-1", priority: "A" },
        { id: "school-2", priority: "A" },
        { id: "school-3", priority: "B" },
        { id: "school-4", priority: "C" },
      ] as unknown[];
      mockContext.interactions = [];

      const result = await officialVisitRule.evaluate(mockContext);
      expect(result).not.toBeNull(); // Should trigger, no visits exist
    });
  });
});
