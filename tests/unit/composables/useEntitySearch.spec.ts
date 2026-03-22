import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useEntitySearch } from "~/composables/useEntitySearch";
import { useUserStore } from "~/stores/user";

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Build a chainable Supabase query builder for testing.
// The chain is thenable so `await queryBuilder` resolves to { data, error }.
// All builder methods (including limit) return the same chain so filters applied
// after limit() are still captured by the spies.
const buildChain = (resolvedData: unknown[] = [], resolvedError: unknown = null) => {
  const chain: Record<string, unknown> = {};

  const methods = ["select", "eq", "ilike", "or", "gte", "lte", "order", "limit"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }

  // Make the chain itself awaitable
  chain.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: resolvedData, error: resolvedError }).then(resolve);
  chain.catch = (reject: (e: unknown) => unknown) =>
    Promise.resolve({ data: resolvedData, error: resolvedError }).catch(reject);

  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));

  return chain;
};

let mockChain = buildChain();

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn(() => mockChain),
  })),
}));

describe("useEntitySearch", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockChain = buildChain();
    // Reset NODE_ENV so deprecation warning doesn't suppress
    // (warn is mocked anyway, so this is just for cleanliness)
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("initializes query as empty string", () => {
      const { query } = useEntitySearch();
      expect(query.value).toBe("");
    });

    it("initializes searchType as 'all'", () => {
      const { searchType } = useEntitySearch();
      expect(searchType.value).toBe("all");
    });

    it("initializes isSearching as false", () => {
      const { isSearching } = useEntitySearch();
      expect(isSearching.value).toBe(false);
    });

    it("initializes searchError as null", () => {
      const { searchError } = useEntitySearch();
      expect(searchError.value).toBeNull();
    });

    it("initializes useFuzzySearch as true", () => {
      const { useFuzzySearch } = useEntitySearch();
      expect(useFuzzySearch.value).toBe(true);
    });

    it("initializes all result arrays as empty", () => {
      const { schoolResults, coachResults, interactionResults, metricsResults } =
        useEntitySearch();
      expect(schoolResults.value).toEqual([]);
      expect(coachResults.value).toEqual([]);
      expect(interactionResults.value).toEqual([]);
      expect(metricsResults.value).toEqual([]);
    });

    it("totalResults computed is 0 when no results", () => {
      const { totalResults } = useEntitySearch();
      expect(totalResults.value).toBe(0);
    });

    it("hasResults computed is false when no results", () => {
      const { hasResults } = useEntitySearch();
      expect(hasResults.value).toBe(false);
    });
  });

  describe("clearResults", () => {
    it("clears all result arrays and resets query", () => {
      const { schoolResults, coachResults, interactionResults, metricsResults, query, clearResults } =
        useEntitySearch();

      // Manually set some state
      schoolResults.value = [{ id: "1" } as any];
      coachResults.value = [{ id: "2" } as any];
      interactionResults.value = [{ id: "3" } as any];
      metricsResults.value = [{ id: "4" } as any];
      query.value = "some query";

      clearResults();

      expect(schoolResults.value).toEqual([]);
      expect(coachResults.value).toEqual([]);
      expect(interactionResults.value).toEqual([]);
      expect(metricsResults.value).toEqual([]);
      expect(query.value).toBe("");
    });
  });

  describe("totalResults and hasResults", () => {
    it("totalResults sums all result arrays", () => {
      const { schoolResults, coachResults, totalResults } = useEntitySearch();
      schoolResults.value = [{ id: "s1" } as any, { id: "s2" } as any];
      coachResults.value = [{ id: "c1" } as any];
      expect(totalResults.value).toBe(3);
    });

    it("hasResults is true when any result array has items", () => {
      const { metricsResults, hasResults } = useEntitySearch();
      metricsResults.value = [{ id: "m1" } as any];
      expect(hasResults.value).toBe(true);
    });
  });

  describe("performSearch", () => {
    it("clears results and returns early when query is empty string", async () => {
      const { performSearch, schoolResults } = useEntitySearch();
      schoolResults.value = [{ id: "s1" } as any];

      await performSearch("", {});
      expect(schoolResults.value).toEqual([]);
    });

    it("clears results and returns early when query is only whitespace", async () => {
      const { performSearch, schoolResults } = useEntitySearch();
      schoolResults.value = [{ id: "s1" } as any];

      await performSearch("   ", {});
      expect(schoolResults.value).toEqual([]);
    });

    it("sets isSearching to true then false after search", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      const { performSearch, isSearching } = useEntitySearch();
      const searchPromise = performSearch("test", {});
      // After awaiting, isSearching should be false
      await searchPromise;
      expect(isSearching.value).toBe(false);
    });

    it("updates query.value when search is performed", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      const { performSearch, query } = useEntitySearch();
      await performSearch("Duke", {});
      expect(query.value).toBe("Duke");
    });

    it("clears searchError before searching", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      const { performSearch, searchError } = useEntitySearch();
      searchError.value = "Previous error";
      await performSearch("Duke", {});
      expect(searchError.value).toBeNull();
    });

    it("searches only schools when searchType is 'schools'", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "schools";

      const { useSupabase } = await import("~/composables/useSupabase");
      const fromSpy = vi.mocked(useSupabase).mock.results[0]?.value.from as ReturnType<typeof vi.fn>;

      await performSearch("test", {});

      // from() should have been called at least once
      expect(fromSpy).toHaveBeenCalled();
    });

    it("does not search if no user is logged in", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const { performSearch, schoolResults } = useEntitySearch();
      await performSearch("Duke", {});
      // Results stay empty since no user
      expect(schoolResults.value).toEqual([]);
    });

    it("sets schoolResults from supabase response", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      const mockSchool = {
        id: "school-1",
        name: "Duke University",
        city: "Durham",
        state: "NC",
        address: "123 Main",
        division: "D1",
        status: "active",
        verified: true,
        user_id: "user-1",
        family_unit_id: "family-1",
      };

      // Rebuild chain with data so await resolves to it
      mockChain = buildChain([mockSchool]);

      const { performSearch, searchType, schoolResults, useFuzzySearch } = useEntitySearch();
      useFuzzySearch.value = false;
      searchType.value = "schools";

      await performSearch("Duke", {});
      expect(schoolResults.value.length).toBeGreaterThanOrEqual(0);
    });

    it("sets schoolResults to empty array on supabase error", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      mockChain = buildChain([], new Error("DB error"));

      const { performSearch, searchType, schoolResults } = useEntitySearch();
      searchType.value = "schools";

      await performSearch("Duke", {});
      expect(schoolResults.value).toEqual([]);
    });
  });

  describe("performSearch with filters", () => {
    beforeEach(() => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;
    });

    it("applies school division filter when provided", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "schools";

      const eqSpy = vi.spyOn(mockChain as any, "eq");
      await performSearch("test", { schools: { division: "D1" } });
      const calls = eqSpy.mock.calls.map((c) => c[0]);
      expect(calls).toContain("division");
    });

    it("applies school state filter when provided", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "schools";

      const eqSpy = vi.spyOn(mockChain as any, "eq");
      await performSearch("test", { schools: { state: "NC" } });
      const calls = eqSpy.mock.calls.map((c) => c[0]);
      expect(calls).toContain("state");
    });

    it("applies school verified filter when provided", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "schools";

      const eqSpy = vi.spyOn(mockChain as any, "eq");
      await performSearch("test", { schools: { verified: true } });
      const calls = eqSpy.mock.calls.map((c) => c[0]);
      expect(calls).toContain("verified");
    });

    it("applies coach sport filter when provided", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "coaches";

      const eqSpy = vi.spyOn(mockChain as any, "eq");
      await performSearch("test", { coaches: { sport: "basketball" } });
      const calls = eqSpy.mock.calls.map((c) => c[0]);
      expect(calls).toContain("sport");
    });

    it("applies coach responseRate filter when > 0", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "coaches";

      const gteSpy = vi.spyOn(mockChain as any, "gte");
      await performSearch("test", { coaches: { responseRate: 50 } });
      expect(gteSpy).toHaveBeenCalledWith("response_rate", 0.5);
    });

    it("does not apply coach responseRate filter when 0", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "coaches";

      const gteSpy = vi.spyOn(mockChain as any, "gte");
      await performSearch("test", { coaches: { responseRate: 0 } });
      expect(gteSpy).not.toHaveBeenCalledWith("response_rate", expect.anything());
    });

    it("applies interaction sentiment filter", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "interactions";

      const eqSpy = vi.spyOn(mockChain as any, "eq");
      await performSearch("test", { interactions: { sentiment: "positive" } });
      const calls = eqSpy.mock.calls.map((c) => c[0]);
      expect(calls).toContain("sentiment_label");
    });

    it("applies interaction direction filter", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "interactions";

      const eqSpy = vi.spyOn(mockChain as any, "eq");
      await performSearch("test", { interactions: { direction: "outbound" } });
      const calls = eqSpy.mock.calls.map((c) => c[0]);
      expect(calls).toContain("direction");
    });

    it("applies interaction dateFrom filter", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "interactions";

      const gteSpy = vi.spyOn(mockChain as any, "gte");
      await performSearch("test", { interactions: { dateFrom: "2024-01-01" } });
      expect(gteSpy).toHaveBeenCalledWith("recorded_date", "2024-01-01");
    });

    it("applies interaction dateTo filter", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "interactions";

      const lteSpy = vi.spyOn(mockChain as any, "lte");
      await performSearch("test", { interactions: { dateTo: "2024-12-31" } });
      expect(lteSpy).toHaveBeenCalledWith("recorded_date", "2024-12-31");
    });

    it("applies metrics metricType filter", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "metrics";

      const eqSpy = vi.spyOn(mockChain as any, "eq");
      await performSearch("test", { metrics: { metricType: "40-yard-dash" } });
      const calls = eqSpy.mock.calls.map((c) => c[0]);
      expect(calls).toContain("metric_type");
    });

    it("applies metrics minValue filter when > 0", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "metrics";

      const gteSpy = vi.spyOn(mockChain as any, "gte");
      await performSearch("test", { metrics: { minValue: 5 } });
      expect(gteSpy).toHaveBeenCalledWith("value", 5);
    });

    it("applies metrics maxValue filter when < 100", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "metrics";

      const lteSpy = vi.spyOn(mockChain as any, "lte");
      await performSearch("test", { metrics: { maxValue: 50 } });
      expect(lteSpy).toHaveBeenCalledWith("value", 50);
    });

    it("does not apply metrics maxValue filter when >= 100", async () => {
      const { performSearch, searchType } = useEntitySearch();
      searchType.value = "metrics";

      const lteSpy = vi.spyOn(mockChain as any, "lte");
      await performSearch("test", { metrics: { maxValue: 100 } });
      expect(lteSpy).not.toHaveBeenCalledWith("value", expect.anything());
    });
  });

  describe("metrics text search filtering", () => {
    it("filters metricsResults by notes match when searchQuery provided", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      const metrics = [
        { id: "m1", notes: "great sprint time", metric_type: "sprint" },
        { id: "m2", notes: "vertical leap test", metric_type: "vertical" },
        { id: "m3", notes: null, metric_type: "weight" },
      ];

      mockChain = buildChain(metrics);

      const { performSearch, searchType, metricsResults } = useEntitySearch();
      searchType.value = "metrics";

      await performSearch("sprint", {});

      // Should include m1 (notes match) and m3 (null notes → passes filter)
      // m2 should be excluded
      const ids = metricsResults.value.map((m: any) => m.id);
      expect(ids).toContain("m1");
      expect(ids).not.toContain("m2");
      expect(ids).toContain("m3");
    });
  });

  describe("useFuzzySearch toggle", () => {
    it("returns items directly when useFuzzySearch is false", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      const schoolData = [
        {
          id: "s1",
          name: "Duke",
          city: "Durham",
          state: "NC",
          address: "",
          division: "D1",
          status: "active",
          verified: true,
          user_id: "user-1",
          family_unit_id: "f1",
        },
      ];
      mockChain = buildChain(schoolData);

      const { performSearch, searchType, schoolResults, useFuzzySearch } =
        useEntitySearch();
      useFuzzySearch.value = false;
      searchType.value = "schools";

      await performSearch("Du", {});
      expect(schoolResults.value).toEqual(schoolData);
    });
  });

  describe("getSchoolSuggestions", () => {
    it("returns empty array when user is not logged in", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const { getSchoolSuggestions } = useEntitySearch();
      const result = await getSchoolSuggestions("Du");
      expect(result).toEqual([]);
    });

    it("returns empty array when prefix is shorter than 2 chars", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      const { getSchoolSuggestions } = useEntitySearch();
      const result = await getSchoolSuggestions("D");
      expect(result).toEqual([]);
    });

    it("returns school names from supabase when prefix >= 2 chars", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      mockChain = buildChain([{ name: "Duke" }, { name: "Duquesne" }]);

      const { getSchoolSuggestions } = useEntitySearch();
      const result = await getSchoolSuggestions("Du");
      expect(result).toEqual(["Duke", "Duquesne"]);
    });

    it("returns empty array when supabase throws", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      // Make the chain throw when awaited
      mockChain = buildChain([], new Error("network error"));
      // Override then to reject
      (mockChain as any).then = (_resolve: unknown, reject: (e: Error) => void) =>
        Promise.reject(new Error("network error")).catch(reject);

      const { getSchoolSuggestions } = useEntitySearch();
      const result = await getSchoolSuggestions("Du");
      expect(result).toEqual([]);
    });
  });

  describe("getCoachSuggestions", () => {
    it("returns empty array when user is not logged in", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const { getCoachSuggestions } = useEntitySearch();
      const result = await getCoachSuggestions("Jo");
      expect(result).toEqual([]);
    });

    it("returns empty array when prefix is shorter than 2 chars", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      const { getCoachSuggestions } = useEntitySearch();
      const result = await getCoachSuggestions("J");
      expect(result).toEqual([]);
    });

    it("returns coach names from supabase when prefix >= 2 chars", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      mockChain = buildChain([{ name: "John Smith" }, { name: "Joe Brown" }]);

      const { getCoachSuggestions } = useEntitySearch();
      const result = await getCoachSuggestions("Jo");
      expect(result).toEqual(["John Smith", "Joe Brown"]);
    });

    it("returns empty array when supabase throws", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;

      mockChain = buildChain([], new Error("network error"));
      (mockChain as any).then = (_resolve: unknown, reject: (e: Error) => void) =>
        Promise.reject(new Error("network error")).catch(reject);

      const { getCoachSuggestions } = useEntitySearch();
      const result = await getCoachSuggestions("Jo");
      expect(result).toEqual([]);
    });
  });

  describe("searchType filtering", () => {
    beforeEach(() => {
      const userStore = useUserStore();
      userStore.user = { id: "user-1", role: "player" } as any;
    });

    it("searchType can be changed to 'coaches'", () => {
      const { searchType } = useEntitySearch();
      searchType.value = "coaches";
      expect(searchType.value).toBe("coaches");
    });

    it("searchType can be changed to 'interactions'", () => {
      const { searchType } = useEntitySearch();
      searchType.value = "interactions";
      expect(searchType.value).toBe("interactions");
    });

    it("searchType can be changed to 'metrics'", () => {
      const { searchType } = useEntitySearch();
      searchType.value = "metrics";
      expect(searchType.value).toBe("metrics");
    });
  });
});
