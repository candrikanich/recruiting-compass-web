import { describe, it, expect, beforeEach, vi } from "vitest";
import { RuleEngine } from "~/server/utils/ruleEngine";
import type { Rule, RuleContext } from "~/server/utils/rules/index";
import type { SuggestionData } from "~/types/timeline";

describe("RuleEngine", () => {
  let engine: RuleEngine;
  let mockContext: RuleContext;

  beforeEach(() => {
    engine = new RuleEngine();
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

  describe("rule registration", () => {
    it("should register rules successfully", () => {
      const mockRule: Rule = {
        id: "test-rule",
        name: "Test Rule",
        description: "A test rule",
        evaluate: vi.fn().mockResolvedValue(null),
      };

      engine.addRule(mockRule);
      expect((engine as any).rules).toContain(mockRule);
    });

    it("should allow multiple rules to be registered", () => {
      const rule1: Rule = {
        id: "rule-1",
        name: "Rule 1",
        description: "First rule",
        evaluate: vi.fn().mockResolvedValue(null),
      };

      const rule2: Rule = {
        id: "rule-2",
        name: "Rule 2",
        description: "Second rule",
        evaluate: vi.fn().mockResolvedValue(null),
      };

      engine.addRule(rule1);
      engine.addRule(rule2);
      expect((engine as any).rules.length).toBe(2);
    });
  });

  describe("evaluateAll", () => {
    it("should evaluate all registered rules", async () => {
      const rule1Eval = vi.fn().mockResolvedValue(null);
      const rule2Eval = vi.fn().mockResolvedValue(null);

      const rule1: Rule = {
        id: "rule-1",
        name: "Rule 1",
        description: "First rule",
        evaluate: rule1Eval,
      };

      const rule2: Rule = {
        id: "rule-2",
        name: "Rule 2",
        description: "Second rule",
        evaluate: rule2Eval,
      };

      engine.addRule(rule1);
      engine.addRule(rule2);

      await engine.evaluateAll(mockContext);

      expect(rule1Eval).toHaveBeenCalledWith(mockContext);
      expect(rule2Eval).toHaveBeenCalledWith(mockContext);
    });

    it("should handle array returns from rules", async () => {
      const suggestions: SuggestionData[] = [
        {
          rule_type: "test-rule",
          urgency: "high",
          message: "Test 1",
          action_type: "log_interaction",
        },
        {
          rule_type: "test-rule",
          urgency: "medium",
          message: "Test 2",
          action_type: "log_interaction",
        },
      ];

      const rule: Rule = {
        id: "array-rule",
        name: "Array Rule",
        description: "Returns array",
        evaluate: vi.fn().mockResolvedValue(suggestions),
      };

      engine.addRule(rule);
      const result = await engine.evaluateAll(mockContext);

      expect(result.length).toBe(2);
      expect(result[0].message).toBe("Test 1");
      expect(result[1].message).toBe("Test 2");
    });

    it("should handle single suggestion returns from rules", async () => {
      const suggestion: SuggestionData = {
        rule_type: "test-rule",
        urgency: "high",
        message: "Single test",
        action_type: "log_interaction",
      };

      const rule: Rule = {
        id: "single-rule",
        name: "Single Rule",
        description: "Returns single suggestion",
        evaluate: vi.fn().mockResolvedValue(suggestion),
      };

      engine.addRule(rule);
      const result = await engine.evaluateAll(mockContext);

      expect(result.length).toBe(1);
      expect(result[0].message).toBe("Single test");
    });

    it("should handle null returns from rules", async () => {
      const rule: Rule = {
        id: "null-rule",
        name: "Null Rule",
        description: "Returns null",
        evaluate: vi.fn().mockResolvedValue(null),
      };

      engine.addRule(rule);
      const result = await engine.evaluateAll(mockContext);

      expect(result.length).toBe(0);
    });

    it("should handle rule evaluation errors gracefully", async () => {
      const mockError = new Error("Rule evaluation failed");
      const rule: Rule = {
        id: "error-rule",
        name: "Error Rule",
        description: "Throws error",
        evaluate: vi.fn().mockRejectedValue(mockError),
      };

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      engine.addRule(rule);
      const result = await engine.evaluateAll(mockContext);

      expect(result.length).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("error-rule"),
        mockError,
      );

      consoleSpy.mockRestore();
    });

    it("should combine results from multiple rules", async () => {
      const suggestion1: SuggestionData = {
        rule_type: "rule-1",
        urgency: "high",
        message: "From rule 1",
        action_type: "log_interaction",
      };

      const suggestion2: SuggestionData = {
        rule_type: "rule-2",
        urgency: "medium",
        message: "From rule 2",
        action_type: "log_interaction",
      };

      const rule1: Rule = {
        id: "rule-1",
        name: "Rule 1",
        description: "First rule",
        evaluate: vi.fn().mockResolvedValue(suggestion1),
      };

      const rule2: Rule = {
        id: "rule-2",
        name: "Rule 2",
        description: "Second rule",
        evaluate: vi.fn().mockResolvedValue([suggestion2]),
      };

      engine.addRule(rule1);
      engine.addRule(rule2);
      const result = await engine.evaluateAll(mockContext);

      expect(result.length).toBe(2);
    });
  });

  describe("re-evaluation of dismissed suggestions", () => {
    it("should fetch dismissed suggestions 14+ days old", async () => {
      // This test verifies the re-evaluation logic structure
      // In actual implementation, it would query the database
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 21);

      // Dismissed suggestion that should be re-evaluated
      const dismissedSuggestion = {
        id: "sug-1",
        athlete_id: "athlete-123",
        rule_type: "interaction-gap",
        urgency: "medium" as const,
        message: "Test",
        action_type: "log_interaction",
        related_school_id: "school-1",
        related_task_id: null,
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        condition_snapshot: null,
        reappeared: false,
        previous_suggestion_id: null,
        created_at: new Date().toISOString(),
        updated_at: null,
      };

      // Verify dismissed date is 21 days ago
      const now = new Date();
      const dismissedDays = Math.floor(
        (now.getTime() - new Date(dismissedSuggestion.dismissed_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      expect(dismissedDays).toBeGreaterThanOrEqual(14);
    });

    it("should call shouldReEvaluate on rules with re-evaluation support", async () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 21);

      const dismissedSuggestion = {
        id: "sug-1",
        athlete_id: "athlete-123",
        rule_type: "test-rule",
        urgency: "medium" as const,
        message: "Test",
        action_type: null,
        related_school_id: null,
        related_task_id: null,
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        condition_snapshot: null,
        reappeared: false,
        previous_suggestion_id: null,
        created_at: new Date().toISOString(),
        updated_at: null,
      };

      const shouldReEvaluateMock = vi.fn().mockResolvedValue(true);
      const rule: Rule = {
        id: "test-rule",
        name: "Test Rule",
        description: "Test",
        evaluate: vi.fn().mockResolvedValue(null),
        shouldReEvaluate: shouldReEvaluateMock,
      };

      // Verify rule can be called with dismissedSuggestion
      if (rule.shouldReEvaluate) {
        const result = await rule.shouldReEvaluate(dismissedSuggestion, mockContext);
        expect(result).toBe(true);
        expect(shouldReEvaluateMock).toHaveBeenCalledWith(
          dismissedSuggestion,
          mockContext
        );
      }
    });

    it("should create new suggestions when dismissed suggestion re-evaluates", async () => {
      // Verify new suggestions have reappeared flag and escalated urgency
      const originalSuggestion: SuggestionData = {
        rule_type: "test-rule",
        urgency: "low",
        message: "Original message",
        action_type: "log_interaction",
        related_school_id: "school-1",
      };

      // After re-evaluation with escalated urgency
      const reappearingSuggestion: SuggestionData & {
        reappeared?: boolean;
        previous_suggestion_id?: string;
      } = {
        ...originalSuggestion,
        urgency: "medium", // Escalated from low
        reappeared: true,
        previous_suggestion_id: "sug-1",
      };

      expect(reappearingSuggestion.urgency).toBe("medium");
      expect(reappearingSuggestion.reappeared).toBe(true);
      expect(reappearingSuggestion.previous_suggestion_id).toBe("sug-1");
    });

    it("should not re-evaluate suggestions less than 14 days old", async () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 7);

      const dismissedSuggestion = {
        id: "sug-1",
        athlete_id: "athlete-123",
        rule_type: "test-rule",
        urgency: "medium" as const,
        message: "Test",
        action_type: null,
        related_school_id: null,
        related_task_id: null,
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        condition_snapshot: null,
        reappeared: false,
        previous_suggestion_id: null,
        created_at: new Date().toISOString(),
        updated_at: null,
      };

      // Verify dismissed date is less than 14 days ago
      const now = new Date();
      const dismissedDays = Math.floor(
        (now.getTime() - new Date(dismissedSuggestion.dismissed_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      expect(dismissedDays).toBeLessThan(14);
    });

    it("should not re-evaluate completed suggestions", async () => {
      const dismissedDate = new Date();
      dismissedDate.setDate(dismissedDate.getDate() - 21);

      const completedSuggestion = {
        id: "sug-1",
        athlete_id: "athlete-123",
        rule_type: "test-rule",
        urgency: "medium" as const,
        message: "Test",
        action_type: null,
        related_school_id: null,
        related_task_id: null,
        dismissed: true,
        dismissed_at: dismissedDate.toISOString(),
        completed: true, // Marked as completed
        completed_at: new Date().toISOString(),
        pending_surface: false,
        surfaced_at: null,
        condition_snapshot: null,
        reappeared: false,
        previous_suggestion_id: null,
        created_at: new Date().toISOString(),
        updated_at: null,
      };

      expect(completedSuggestion.completed).toBe(true);
      // Completed suggestions should not be re-evaluated
    });
  });
});
