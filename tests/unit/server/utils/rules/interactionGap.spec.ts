import { describe, it, expect, beforeEach } from "vitest";
import { interactionGapRule } from "~/server/utils/rules/interactionGap";
import type { RuleContext } from "~/server/utils/rules/index";

describe("interactionGapRule", () => {
  let mockContext: RuleContext;

  beforeEach(() => {
    mockContext = {
      athleteId: "athlete-123",
      athlete: {},
      schools: [],
      interactions: [],
      tasks: [],
      athleteTasks: [],
      videos: [],
      events: [],
    };
  });

  describe("eligibility filtering", () => {
    it("should only evaluate Priority A and B schools", async () => {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      mockContext.schools = [
        {
          id: "school-a",
          priority: "A",
          status: "interested",
          name: "Priority A School",
        },
        {
          id: "school-b",
          priority: "B",
          status: "contacted",
          name: "Priority B School",
        },
        {
          id: "school-c",
          priority: "C",
          status: "interested",
          name: "Priority C School",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-a",
          interaction_date: new Date(thirtyDaysAgo).toISOString(),
        },
        {
          id: "int-2",
          school_id: "school-b",
          interaction_date: new Date(thirtyDaysAgo).toISOString(),
        },
        {
          id: "int-3",
          school_id: "school-c",
          interaction_date: new Date(thirtyDaysAgo).toISOString(),
        },
      ] as unknown[];

      const result = await interactionGapRule.evaluate(mockContext);
      expect(Array.isArray(result)).toBe(true);
      const suggestions = result as unknown[];
      expect(suggestions.length).toBe(2); // Only A and B, not C
    });

    it("should only evaluate interested/contacted/visited status", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "Interested",
        },
        {
          id: "school-2",
          priority: "A",
          status: "not_pursuing",
          name: "Not Pursuing",
        },
        {
          id: "school-3",
          priority: "A",
          status: "committed",
          name: "Committed",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
        {
          id: "int-2",
          school_id: "school-2",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
        {
          id: "int-3",
          school_id: "school-3",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await interactionGapRule.evaluate(mockContext);
      expect(Array.isArray(result)).toBe(true);
      const suggestions = result as unknown[];
      expect(suggestions.length).toBe(1); // Only interested/contacted/visited
    });
  });

  describe("threshold detection", () => {
    it("should return suggestion when 21+ days since last contact", async () => {
      const twentyTwoDaysAgo = new Date();
      twentyTwoDaysAgo.setDate(twentyTwoDaysAgo.getDate() - 22);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: twentyTwoDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await interactionGapRule.evaluate(mockContext);
      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[]).length).toBe(1);
    });

    it("should NOT return suggestion when < 21 days since last contact", async () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: twentyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await interactionGapRule.evaluate(mockContext);
      expect(result).toBeNull();
    });

    it("should return suggestion when no interactions exist", async () => {
      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = []; // No interactions

      const result = await interactionGapRule.evaluate(mockContext);
      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[]).length).toBe(1);
    });
  });

  describe("multiple schools", () => {
    it("should return suggestions for ALL schools meeting criteria", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
        {
          id: "school-2",
          priority: "B",
          status: "contacted",
          name: "School 2",
        },
        { id: "school-3", priority: "A", status: "visited", name: "School 3" },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
        {
          id: "int-2",
          school_id: "school-2",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
        {
          id: "int-3",
          school_id: "school-3",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await interactionGapRule.evaluate(mockContext);
      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[]).length).toBe(3); // All three schools get reminders
    });

    it("should return array of suggestions, not single suggestion", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await interactionGapRule.evaluate(mockContext);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("urgency calculation", () => {
    it("should return medium urgency for 21-29 days", async () => {
      const twentyFiveDaysAgo = new Date();
      twentyFiveDaysAgo.setDate(twentyFiveDaysAgo.getDate() - 25);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: twentyFiveDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await interactionGapRule.evaluate(mockContext);
      expect(Array.isArray(result)).toBe(true);
      const suggestion = (result as unknown[])[0] as Record<string, unknown>;
      expect(suggestion.urgency).toBe("medium");
    });

    it("should return high urgency for 30+ days", async () => {
      const thirtyfiveDaysAgo = new Date();
      thirtyfiveDaysAgo.setDate(thirtyfiveDaysAgo.getDate() - 35);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyfiveDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await interactionGapRule.evaluate(mockContext);
      expect(Array.isArray(result)).toBe(true);
      const suggestion = (result as unknown[])[0] as Record<string, unknown>;
      expect(suggestion.urgency).toBe("high");
    });
  });

  describe("message formatting", () => {
    it("should include school name in message", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "Harvard",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await interactionGapRule.evaluate(mockContext);
      expect(Array.isArray(result)).toBe(true);
      const suggestion = (result as unknown[])[0] as Record<string, unknown>;
      expect((suggestion.message as string).includes("Harvard")).toBe(true);
    });

    it("should include days count in message", async () => {
      const thirtyfiveDaysAgo = new Date();
      thirtyfiveDaysAgo.setDate(thirtyfiveDaysAgo.getDate() - 35);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyfiveDaysAgo.toISOString(),
        },
      ] as unknown[];

      const result = await interactionGapRule.evaluate(mockContext);
      expect(Array.isArray(result)).toBe(true);
      const suggestion = (result as unknown[])[0] as Record<string, unknown>;
      expect((suggestion.message as string).includes("35")).toBe(true);
    });
  });

  describe("createConditionSnapshot", () => {
    it("should create snapshot with days_since_contact and school_priority", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const snapshot = interactionGapRule.createConditionSnapshot?.(
        mockContext,
        "school-1",
      );

      expect(snapshot).toBeDefined();
      expect(snapshot).toHaveProperty("days_since_contact");
      expect(snapshot).toHaveProperty("school_priority");
      expect(snapshot).toHaveProperty("school_status");
    });

    it("should correctly calculate days_since_contact", async () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: twentyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const snapshot = interactionGapRule.createConditionSnapshot?.(
        mockContext,
        "school-1",
      ) as Record<string, unknown>;

      expect(snapshot.days_since_contact).toBe(20);
    });

    it("should capture school priority from priority_tier field", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockContext.schools = [
        {
          id: "school-1",
          priority_tier: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const snapshot = interactionGapRule.createConditionSnapshot?.(
        mockContext,
        "school-1",
      ) as Record<string, unknown>;

      expect(snapshot.school_priority).toBe("A");
    });
  });

  describe("shouldReEvaluate", () => {
    it("returns false if dismissed < 14 days ago", async () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const dismissedSuggestion = {
        id: "sug-1",
        athlete_id: "athlete-123",
        rule_type: "interaction-gap",
        urgency: "medium" as const,
        message: "Test",
        action_type: null,
        related_school_id: "school-1",
        related_task_id: null,
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        condition_snapshot: { days_since_contact: 21, school_priority: "A" },
        reappeared: false,
        previous_suggestion_id: null,
        created_at: null,
        updated_at: null,
      };

      const result = await interactionGapRule.shouldReEvaluate?.(
        dismissedSuggestion,
        mockContext,
      );

      expect(result).toBe(false);
    });

    it("returns true if gap increased by 14+ days", async () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 21); // Dismissed 21 days ago
      const thirtyfiveDaysAgo = new Date();
      thirtyfiveDaysAgo.setDate(thirtyfiveDaysAgo.getDate() - 35); // Now 35 days gap

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyfiveDaysAgo.toISOString(),
        },
      ] as unknown[];

      const dismissedSuggestion = {
        id: "sug-1",
        athlete_id: "athlete-123",
        rule_type: "interaction-gap",
        urgency: "medium" as const,
        message: "Test",
        action_type: null,
        related_school_id: "school-1",
        related_task_id: null,
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        condition_snapshot: { days_since_contact: 21, school_priority: "A" },
        reappeared: false,
        previous_suggestion_id: null,
        created_at: null,
        updated_at: null,
      };

      const result = await interactionGapRule.shouldReEvaluate?.(
        dismissedSuggestion,
        mockContext,
      );

      expect(result).toBe(true);
    });

    it("returns true if school priority changed", async () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 21);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockContext.schools = [
        {
          id: "school-1",
          priority: "B",
          status: "interested",
          name: "School 1",
        }, // Changed to B
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const dismissedSuggestion = {
        id: "sug-1",
        athlete_id: "athlete-123",
        rule_type: "interaction-gap",
        urgency: "medium" as const,
        message: "Test",
        action_type: null,
        related_school_id: "school-1",
        related_task_id: null,
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        condition_snapshot: { days_since_contact: 21, school_priority: "A" }, // Was A
        reappeared: false,
        previous_suggestion_id: null,
        created_at: null,
        updated_at: null,
      };

      const result = await interactionGapRule.shouldReEvaluate?.(
        dismissedSuggestion,
        mockContext,
      );

      expect(result).toBe(true);
    });

    it("returns false if gap only increased by < 14 days", async () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 21);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Only 30 days, was 21

      mockContext.schools = [
        {
          id: "school-1",
          priority: "A",
          status: "interested",
          name: "School 1",
        },
      ] as unknown[];

      mockContext.interactions = [
        {
          id: "int-1",
          school_id: "school-1",
          interaction_date: thirtyDaysAgo.toISOString(),
        },
      ] as unknown[];

      const dismissedSuggestion = {
        id: "sug-1",
        athlete_id: "athlete-123",
        rule_type: "interaction-gap",
        urgency: "medium" as const,
        message: "Test",
        action_type: null,
        related_school_id: "school-1",
        related_task_id: null,
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        condition_snapshot: { days_since_contact: 21, school_priority: "A" },
        reappeared: false,
        previous_suggestion_id: null,
        created_at: null,
        updated_at: null,
      };

      const result = await interactionGapRule.shouldReEvaluate?.(
        dismissedSuggestion,
        mockContext,
      );

      expect(result).toBe(false);
    });
  });
});
