import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findExistingSuggestion } from "~/server/utils/rules/index";
import type { Rule, RuleContext } from "~/server/utils/rules/index";
import type { Suggestion, SuggestionData } from "~/types/timeline";

interface QueryMock {
  supabase: SupabaseClient;
  gte: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
}

function makeQueryMock(
  rows: Array<{ id: string; message: string | null }>,
): QueryMock {
  const gte = vi.fn();
  const eq = vi.fn();
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: eq.mockImplementation(() => builder),
    gte: gte.mockImplementation(() => builder),
    limit: vi.fn(async () => ({ data: rows, error: null })),
  };
  const supabase = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient;
  return { supabase, gte, eq };
}

describe("findExistingSuggestion", () => {
  const suggestion = {
    rule_type: "school-list-building",
    urgency: "medium",
    message: "You have 4 schools on your list.",
    action_type: "add_school",
  } as SuggestionData;

  it("matches an active row regardless of age when no window is given", async () => {
    const { supabase, gte } = makeQueryMock([
      { id: "existing-1", message: "old message" },
    ]);

    const result = await findExistingSuggestion(
      supabase,
      "athlete-1",
      suggestion,
    );

    // No created_at cutoff — an active duplicate 30 days old still matches,
    // preventing the weekly-cron duplicate-accumulation bug.
    expect(gte).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "existing-1", message: "old message" });
  });

  it("applies a created_at cutoff only when daysWindow is provided", async () => {
    const { supabase, gte } = makeQueryMock([]);

    await findExistingSuggestion(supabase, "athlete-1", suggestion, 7);

    expect(gte).toHaveBeenCalledTimes(1);
  });

  it("scopes to related_school_id when present", async () => {
    const { supabase, eq } = makeQueryMock([]);

    await findExistingSuggestion(supabase, "athlete-1", {
      ...suggestion,
      related_school_id: "school-9",
    } as SuggestionData);

    expect(eq).toHaveBeenCalledWith("related_school_id", "school-9");
  });

  it("returns null when no active row exists", async () => {
    const { supabase } = makeQueryMock([]);

    const result = await findExistingSuggestion(
      supabase,
      "athlete-1",
      suggestion,
    );

    expect(result).toBeNull();
  });
});

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
