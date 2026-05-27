import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rule, RuleContext } from "~/server/utils/rules/index";
import type { SuggestionData, Suggestion } from "~/types/timeline";

vi.mock("~/server/utils/rules/index", async () => {
  const actual =
    await vi.importActual<typeof import("~/server/utils/rules/index")>(
      "~/server/utils/rules/index",
    );
  return {
    ...actual,
    findExistingSuggestion: vi.fn(),
  };
});

vi.mock("~/server/utils/ncaaRecruitingCalendar", () => ({
  isDeadPeriod: vi.fn(() => false),
}));

vi.mock("~/server/utils/rules/ruleEngineHelpers", () => ({
  escalateUrgency: vi.fn((u: string) => (u === "low" ? "medium" : "high")),
}));

import { RuleEngine } from "~/server/utils/ruleEngine";
import { findExistingSuggestion } from "~/server/utils/rules/index";

const mockedFindExisting = vi.mocked(findExistingSuggestion);

function buildSuggestion(over: Partial<SuggestionData> = {}): SuggestionData {
  return {
    rule_type: "test-rule",
    urgency: "medium",
    message: "default message",
    action_type: "view",
    ...over,
  } as SuggestionData;
}

function buildDismissed(over: Partial<Suggestion> = {}): Suggestion {
  return {
    id: "dismissed-1",
    athlete_id: "athlete-1",
    rule_type: "interaction-gap",
    urgency: "low",
    message: "old message",
    dismissed: true,
    dismissed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    reappeared: false,
    related_school_id: null,
    ...over,
  } as Suggestion;
}

function makeContext(): RuleContext {
  return {
    athleteId: "athlete-1",
    athlete: {},
    schools: [],
    interactions: [],
    tasks: [],
    athleteTasks: [],
    videos: [],
    events: [],
  };
}

interface FromSpy {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  selectAfterInsert: ReturnType<typeof vi.fn>;
  singleAfterInsert: ReturnType<typeof vi.fn>;
  eqAfterUpdate: ReturnType<typeof vi.fn>;
  dismissedQuery: ReturnType<typeof vi.fn>;
}

function makeSupabase({
  dismissedRows = [] as Suggestion[],
  dismissedError = null as unknown,
  insertReturn = { data: { id: "new-id" }, error: null } as {
    data: { id: string } | null;
    error: unknown;
  },
  updateError = null as unknown,
}: {
  dismissedRows?: Suggestion[];
  dismissedError?: unknown;
  insertReturn?: { data: { id: string } | null; error: unknown };
  updateError?: unknown;
} = {}): { supabase: SupabaseClient; spy: FromSpy } {
  const spy: FromSpy = {
    insert: vi.fn(),
    update: vi.fn(),
    selectAfterInsert: vi.fn(),
    singleAfterInsert: vi.fn(),
    eqAfterUpdate: vi.fn(),
    dismissedQuery: vi.fn(),
  };

  spy.singleAfterInsert.mockResolvedValue(insertReturn);
  spy.selectAfterInsert.mockReturnValue({ single: spy.singleAfterInsert });
  spy.insert.mockReturnValue({ select: spy.selectAfterInsert });
  spy.eqAfterUpdate.mockResolvedValue({ error: updateError });
  spy.update.mockReturnValue({ eq: spy.eqAfterUpdate });

  // dismissed-suggestion fetch chain: .from('suggestion').select('*').eq().eq().eq().lte()
  const lte = vi.fn().mockResolvedValue({
    data: dismissedRows,
    error: dismissedError,
  });
  const eq3 = vi.fn().mockReturnValue({ lte });
  const eq2 = vi.fn().mockReturnValue({ eq: eq3 });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  spy.dismissedQuery.mockReturnValue({ select });

  const supabase = {
    from: vi.fn(() => ({
      select,
      eq: eq1,
      insert: spy.insert,
      update: spy.update,
    })),
  } as unknown as SupabaseClient;

  return { supabase, spy };
}

describe("RuleEngine.generateSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindExisting.mockResolvedValue(null);
  });

  it("inserts new suggestions and returns their ids", async () => {
    const rule: Rule = {
      id: "rule-a",
      name: "a",
      description: "",
      evaluate: vi.fn().mockResolvedValue(buildSuggestion()),
    };
    const engine = new RuleEngine([rule]);
    const { supabase, spy } = makeSupabase({
      insertReturn: { data: { id: "id-1" }, error: null },
    });

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(result.count).toBe(1);
    expect(result.ids).toEqual(["id-1"]);
    expect(spy.insert).toHaveBeenCalledTimes(1);
  });

  it("skips insertion and updates message when existing suggestion differs", async () => {
    const rule: Rule = {
      id: "rule-a",
      name: "a",
      description: "",
      evaluate: vi.fn().mockResolvedValue(buildSuggestion({ message: "new" })),
    };
    mockedFindExisting.mockResolvedValue({
      id: "existing-id",
      message: "old",
    } as Suggestion);
    const engine = new RuleEngine([rule]);
    const { supabase, spy } = makeSupabase();

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(result.count).toBe(0);
    expect(spy.insert).not.toHaveBeenCalled();
    expect(spy.update).toHaveBeenCalledWith({ message: "new" });
    expect(spy.eqAfterUpdate).toHaveBeenCalledWith("id", "existing-id");
  });

  it("does not update when existing suggestion message matches", async () => {
    const rule: Rule = {
      id: "rule-a",
      name: "a",
      description: "",
      evaluate: vi.fn().mockResolvedValue(buildSuggestion({ message: "same" })),
    };
    mockedFindExisting.mockResolvedValue({
      id: "existing-id",
      message: "same",
    } as Suggestion);
    const engine = new RuleEngine([rule]);
    const { supabase, spy } = makeSupabase();

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(result.count).toBe(0);
    expect(spy.update).not.toHaveBeenCalled();
  });

  it("logs and continues when insert fails", async () => {
    const rule: Rule = {
      id: "rule-a",
      name: "a",
      description: "",
      evaluate: vi.fn().mockResolvedValue(buildSuggestion()),
    };
    const engine = new RuleEngine([rule]);
    const { supabase } = makeSupabase({
      insertReturn: { data: null, error: { message: "db down" } },
    });

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(result.count).toBe(0);
    expect(result.ids).toEqual([]);
  });

  it("returns an empty result when no rules produce suggestions", async () => {
    const engine = new RuleEngine([]);
    const { supabase } = makeSupabase();
    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );
    expect(result.count).toBe(0);
    expect(result.ids).toEqual([]);
  });
});

describe("RuleEngine.reEvaluateDismissedSuggestions (via generateSuggestions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindExisting.mockResolvedValue(null);
  });

  it("re-creates dismissed suggestion with escalated urgency and reappeared=true", async () => {
    const dismissed = buildDismissed({
      rule_type: "interaction-gap",
      related_school_id: "school-1",
      urgency: "low",
    });

    const rule: Rule = {
      id: "interaction-gap",
      name: "Interaction Gap",
      description: "",
      evaluate: vi.fn().mockResolvedValue([
        buildSuggestion({
          rule_type: "interaction-gap",
          related_school_id: "school-1",
          urgency: "low",
          message: "still gap",
        }),
      ]),
      shouldReEvaluate: vi.fn().mockResolvedValue(true),
      createConditionSnapshot: vi.fn().mockReturnValue({ days: 30 }),
    };
    const engine = new RuleEngine([rule]);
    const { supabase, spy } = makeSupabase({
      dismissedRows: [dismissed],
      insertReturn: { data: { id: "new-1" }, error: null },
    });

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(rule.shouldReEvaluate).toHaveBeenCalledWith(
      dismissed,
      expect.any(Object),
    );
    // Both the fresh evaluation AND the re-evaluated dismissed suggestion are
    // appended; with findExistingSuggestion mocked to null both are inserted.
    expect(result.count).toBe(2);
    const reappearedInsert = spy.insert.mock.calls
      .map((c) => c[0])
      .find((arg: Record<string, unknown>) => arg.reappeared === true);
    expect(reappearedInsert).toBeDefined();
    expect(reappearedInsert?.previous_suggestion_id).toBe("dismissed-1");
    expect(reappearedInsert?.urgency).toBe("medium"); // escalated from low
    expect(reappearedInsert?.condition_snapshot).toEqual({ days: 30 });
  });

  it("skips re-evaluation when shouldReEvaluate returns false", async () => {
    const dismissed = buildDismissed();
    const rule: Rule = {
      id: "interaction-gap",
      name: "",
      description: "",
      evaluate: vi.fn().mockResolvedValue(null),
      shouldReEvaluate: vi.fn().mockResolvedValue(false),
    };
    const engine = new RuleEngine([rule]);
    const { supabase, spy } = makeSupabase({ dismissedRows: [dismissed] });

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(result.count).toBe(0);
    expect(spy.insert).not.toHaveBeenCalled();
  });

  it("skips rules without shouldReEvaluate implementation", async () => {
    const dismissed = buildDismissed();
    const rule: Rule = {
      id: "interaction-gap",
      name: "",
      description: "",
      evaluate: vi.fn().mockResolvedValue(null),
    };
    const engine = new RuleEngine([rule]);
    const { supabase, spy } = makeSupabase({ dismissedRows: [dismissed] });

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(result.count).toBe(0);
    expect(spy.insert).not.toHaveBeenCalled();
  });

  it("returns empty when dismissed-suggestion fetch errors", async () => {
    const rule: Rule = {
      id: "interaction-gap",
      name: "",
      description: "",
      evaluate: vi.fn().mockResolvedValue(null),
      shouldReEvaluate: vi.fn().mockResolvedValue(true),
    };
    const engine = new RuleEngine([rule]);
    const { supabase } = makeSupabase({
      dismissedError: { message: "boom" },
    });

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(result.count).toBe(0);
    expect(rule.shouldReEvaluate).not.toHaveBeenCalled();
  });

  it("matches re-evaluated suggestion by rule_type when no school id present", async () => {
    const dismissed = buildDismissed({
      related_school_id: null,
      rule_type: "interaction-gap",
    });
    const rule: Rule = {
      id: "interaction-gap",
      name: "",
      description: "",
      evaluate: vi.fn().mockResolvedValue(
        buildSuggestion({
          rule_type: "interaction-gap",
          message: "current",
        }),
      ),
      shouldReEvaluate: vi.fn().mockResolvedValue(true),
    };
    const engine = new RuleEngine([rule]);
    const { supabase, spy } = makeSupabase({
      dismissedRows: [dismissed],
      insertReturn: { data: { id: "re-1" }, error: null },
    });

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(result.count).toBe(2);
    const reappeared = spy.insert.mock.calls
      .map((c) => c[0])
      .find((arg: Record<string, unknown>) => arg.reappeared === true);
    expect(reappeared).toBeDefined();
  });

  it("swallows shouldReEvaluate errors and continues", async () => {
    const dismissed1 = buildDismissed({ id: "d1" });
    const dismissed2 = buildDismissed({ id: "d2" });
    const rule: Rule = {
      id: "interaction-gap",
      name: "",
      description: "",
      evaluate: vi.fn().mockResolvedValue(null),
      shouldReEvaluate: vi
        .fn()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce(false),
    };
    const engine = new RuleEngine([rule]);
    const { supabase } = makeSupabase({
      dismissedRows: [dismissed1, dismissed2],
    });

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(result.count).toBe(0);
    expect(rule.shouldReEvaluate).toHaveBeenCalledTimes(2);
  });

  it("logs when update of changed message fails", async () => {
    const rule: Rule = {
      id: "rule-a",
      name: "",
      description: "",
      evaluate: vi.fn().mockResolvedValue(buildSuggestion({ message: "new" })),
    };
    mockedFindExisting.mockResolvedValue({
      id: "existing-id",
      message: "old",
    } as Suggestion);
    const engine = new RuleEngine([rule]);
    const { supabase, spy } = makeSupabase({
      updateError: { message: "fail" },
    });

    const result = await engine.generateSuggestions(
      supabase,
      "athlete-1",
      makeContext(),
    );

    expect(result.count).toBe(0);
    expect(spy.update).toHaveBeenCalled();
  });
});
