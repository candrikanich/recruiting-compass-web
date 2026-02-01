import { describe, it, expect, vi } from "vitest";
import type { Rule, RuleContext } from "~/server/utils/rules/index";
import type { Suggestion, SuggestionData } from "~/types/timeline";

describe("Rule interface", () => {
  describe("shouldReEvaluate method", () => {
    it("allows rule with optional shouldReEvaluate method", async () => {
      const mockContext: RuleContext = {
        athleteId: "athlete-1",
        athlete: {},
        schools: [],
        interactions: [],
        tasks: [],
        athleteTasks: [],
        videos: [],
        events: [],
      };

      const mockSuggestion: Suggestion = {
        id: "suggestion-1",
        athlete_id: "athlete-1",
        rule_type: "test-rule",
        urgency: "medium",
        message: "Test",
        action_type: null,
        related_school_id: null,
        related_task_id: null,
        dismissed: true,
        dismissed_at: new Date().toISOString(),
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        condition_snapshot: null,
        reappeared: false,
        previous_suggestion_id: null,
        created_at: null,
        updated_at: null,
      };

      const ruleWithReEvaluate: Rule = {
        id: "test-rule",
        name: "Test Rule",
        description: "Test rule with re-evaluation",
        evaluate: async () => null,
        shouldReEvaluate: async (dismissedSuggestion, context) => {
          return dismissedSuggestion.dismissed && !!context.athleteId;
        },
      };

      const result = await ruleWithReEvaluate.shouldReEvaluate?.(
        mockSuggestion,
        mockContext,
      );
      expect(result).toBe(true);
    });

    it("allows rule without shouldReEvaluate method", () => {
      const ruleWithoutReEvaluate: Rule = {
        id: "test-rule",
        name: "Test Rule",
        description: "Test rule without re-evaluation",
        evaluate: async () => null,
      };

      expect(ruleWithoutReEvaluate.shouldReEvaluate).toBeUndefined();
    });

    it("calls shouldReEvaluate if defined", async () => {
      const mockContext: RuleContext = {
        athleteId: "athlete-1",
        athlete: {},
        schools: [],
        interactions: [],
        tasks: [],
        athleteTasks: [],
        videos: [],
        events: [],
      };

      const mockSuggestion: Suggestion = {
        id: "suggestion-1",
        athlete_id: "athlete-1",
        rule_type: "test-rule",
        urgency: "low",
        message: "Test",
        action_type: null,
        related_school_id: null,
        related_task_id: null,
        dismissed: true,
        dismissed_at: new Date().toISOString(),
        completed: false,
        completed_at: null,
        pending_surface: false,
        surfaced_at: null,
        condition_snapshot: null,
        reappeared: false,
        previous_suggestion_id: null,
        created_at: null,
        updated_at: null,
      };

      const shouldReEvaluateMock = vi.fn(async () => true);

      const rule: Rule = {
        id: "test-rule",
        name: "Test Rule",
        description: "Test",
        evaluate: async () => null,
        shouldReEvaluate: shouldReEvaluateMock,
      };

      if (rule.shouldReEvaluate) {
        await rule.shouldReEvaluate(mockSuggestion, mockContext);
      }

      expect(shouldReEvaluateMock).toHaveBeenCalledWith(
        mockSuggestion,
        mockContext,
      );
    });
  });

  describe("createConditionSnapshot method", () => {
    it("allows rule with optional createConditionSnapshot method", async () => {
      const mockContext: RuleContext = {
        athleteId: "athlete-1",
        athlete: {},
        schools: [],
        interactions: [],
        tasks: [],
        athleteTasks: [],
        videos: [],
        events: [],
      };

      const rule: Rule = {
        id: "test-rule",
        name: "Test Rule",
        description: "Test",
        evaluate: async () => null,
        createConditionSnapshot: (context) => {
          return { test: "snapshot" };
        },
      };

      const snapshot = rule.createConditionSnapshot?.(mockContext);
      expect(snapshot).toEqual({ test: "snapshot" });
    });

    it("allows rule without createConditionSnapshot method", () => {
      const rule: Rule = {
        id: "test-rule",
        name: "Test Rule",
        description: "Test",
        evaluate: async () => null,
      };

      expect(rule.createConditionSnapshot).toBeUndefined();
    });
  });
});
