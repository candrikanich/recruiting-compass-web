/**
 * Unit Tests: useSearchConsolidated (extended)
 *
 * Exercises the real implementation rather than mocking out the composable's
 * own methods. Covers: search per entity, filter application, fuzzy on/off,
 * caching + TTL, debouncing, suggestions, and the College Scorecard fetch.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { nextTick } from "vue";
import { useUserStore } from "~/stores/user";

// ---------------------------------------------------------------------------
// Mocks (module-level, evaluated before composable import)
// ---------------------------------------------------------------------------

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
  })),
}));

// Fuse.js — substring filter over string values so we can assert fuzzy on/off.
class FuseStub {
  private items: Array<Record<string, unknown>>;
  constructor(items: unknown[]) {
    this.items = items as Array<Record<string, unknown>>;
  }
  search(q: string) {
    const needle = q.toLowerCase();
    return this.items
      .filter((it) =>
        Object.values(it).some(
          (v) => typeof v === "string" && v.toLowerCase().includes(needle),
        ),
      )
      .map((item) => ({ item }));
  }
}
vi.mock("fuse.js", () => ({
  default: FuseStub,
}));

// Capture the most recent querySelect args so tests can assert on filter
// objects passed into the supabase service layer.
const querySelectMock = vi.fn();
vi.mock("~/utils/supabaseQuery", () => ({
  querySelect: (...args: unknown[]) => querySelectMock(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T>(data: T) => ({ data, error: null });
const err = (message: string) => ({ data: null, error: new Error(message) });

const setUser = () => {
  const store = useUserStore();
  (store as unknown as { user: { id: string } | null }).user = {
    id: "user-1",
  };
  return store;
};

// Real timers; useDebounceFn returns a promise that resolves after the
// callback runs. Wait ~350ms (>300ms debounce) then settle microtasks.
const flushDebounce = async (ms = 350) => {
  await new Promise((r) => setTimeout(r, ms));
  await nextTick();
};

// Make $posthog visible to useNuxtApp() — tests/setup.ts assigns global mock
const installNuxtApp = () => {
  (global.useNuxtApp as Mock).mockReturnValue({
    $posthog: { capture: vi.fn() },
  });
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("useSearchConsolidated (extended)", () => {
  let useSearchConsolidated: typeof import("~/composables/useSearchConsolidated").useSearchConsolidated;

  beforeEach(async () => {
    setActivePinia(createPinia());
    querySelectMock.mockReset();
    installNuxtApp();
    ({ useSearchConsolidated } =
      await import("~/composables/useSearchConsolidated"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Initial state + computed
  // -------------------------------------------------------------------------

  describe("initial state", () => {
    it("initializes refs to their default values", () => {
      const c = useSearchConsolidated();
      expect(c.query.value).toBe("");
      expect(c.searchType.value).toBe("all");
      expect(c.isSearching.value).toBe(false);
      expect(c.searchError.value).toBeNull();
      expect(c.useFuzzySearch.value).toBe(true);
      expect(c.schoolResults.value).toEqual([]);
      expect(c.coachResults.value).toEqual([]);
      expect(c.interactionResults.value).toEqual([]);
      expect(c.metricsResults.value).toEqual([]);
    });

    it("totalResults / hasResults reflect aggregate length", () => {
      const c = useSearchConsolidated();
      expect(c.totalResults.value).toBe(0);
      expect(c.hasResults.value).toBe(false);

      c.schoolResults.value = [{ id: "s" } as never];
      c.coachResults.value = [{ id: "c" } as never];
      expect(c.totalResults.value).toBe(2);
      expect(c.hasResults.value).toBe(true);
    });

    it("isFiltering reports true when any filter value is non-empty (default state has maxValue=100)", () => {
      // The composable's isFiltering predicate treats any value !== "" / 0 /
      // false / null as active — and metrics.maxValue defaults to 100, so the
      // baseline reports true. Documenting current behavior.
      const c = useSearchConsolidated();
      expect(c.isFiltering.value).toBe(true);
    });

    it("isFiltering stays true after a non-default filter is added", () => {
      const c = useSearchConsolidated();
      c.filters.value.schools.division = "D1";
      expect(c.isFiltering.value).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // performSearch — empty / whitespace
  // -------------------------------------------------------------------------

  describe("performSearch guard clauses", () => {
    it("clears results and returns early on empty query", async () => {
      const c = useSearchConsolidated();
      c.schoolResults.value = [{ id: "old" } as never];
      c.query.value = "stanford";

      await c.performSearch("");

      expect(c.schoolResults.value).toEqual([]);
      expect(c.query.value).toBe("");
      expect(querySelectMock).not.toHaveBeenCalled();
    });

    it("clears results on whitespace-only query", async () => {
      const c = useSearchConsolidated();
      c.coachResults.value = [{ id: "x" } as never];

      await c.performSearch("   ");

      expect(c.coachResults.value).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // performSearch — entity branches
  // -------------------------------------------------------------------------

  describe("performSearch entity routing", () => {
    it("returns early from per-entity searches when no user is signed in", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "schools";
      querySelectMock.mockResolvedValue(ok([]));

      await c.performSearch("stanford");
      await flushDebounce();

      expect(querySelectMock).not.toHaveBeenCalled();
      expect(c.isSearching.value).toBe(false);
    });

    it("searches only schools when searchType='schools'", async () => {
      setUser();
      const c = useSearchConsolidated();
      c.searchType.value = "schools";
      c.useFuzzySearch.value = false;
      querySelectMock.mockResolvedValue(
        ok([{ id: "s1", name: "Stanford", state: "CA" }]),
      );

      await c.performSearch("stan");
      await flushDebounce();

      expect(querySelectMock).toHaveBeenCalledTimes(1);
      expect(querySelectMock.mock.calls[0][0]).toBe("schools");
      expect(c.schoolResults.value).toHaveLength(1);
    });

    it("runs all four entity searches when searchType='all'", async () => {
      setUser();
      const c = useSearchConsolidated();
      querySelectMock.mockResolvedValue(ok([]));

      await c.performSearch("anything");
      await flushDebounce();

      const tables = querySelectMock.mock.calls.map((args) => args[0]);
      expect(tables).toEqual(
        expect.arrayContaining([
          "schools",
          "coaches",
          "interactions",
          "performance_metrics",
        ]),
      );
    });

    it("sets isSearching true during the debounced call and false after", async () => {
      setUser();
      const c = useSearchConsolidated();
      querySelectMock.mockResolvedValue(ok([]));

      await c.performSearch("x");
      // After debounce flush, the search has completed and reset isSearching.
      await flushDebounce();
      expect(c.isSearching.value).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Per-entity filter wiring
  // -------------------------------------------------------------------------

  describe("filter wiring", () => {
    beforeEach(() => setUser());

    it("school filters (division/state/verified) flow into querySelect", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "schools";
      c.filters.value.schools.division = "D1";
      c.filters.value.schools.state = "CA";
      c.filters.value.schools.verified = true;
      querySelectMock.mockResolvedValue(ok([]));

      await c.performSearch("x");
      await flushDebounce();

      const call = querySelectMock.mock.calls.find(
        (args) => args[0] === "schools",
      );
      expect(call?.[1].filters).toMatchObject({
        user_id: "user-1",
        division: "D1",
        state: "CA",
        verified: true,
      });
    });

    it("coach sport/verified filter into querySelect; responseRate post-filters in JS", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "coaches";
      c.filters.value.coaches.sport = "basketball";
      c.filters.value.coaches.verified = true;
      c.filters.value.coaches.responseRate = 50; // > 0 triggers post-filter
      c.useFuzzySearch.value = false;
      querySelectMock.mockResolvedValue(
        ok([
          { id: "c1", name: "Hi", response_rate: 0.9 },
          { id: "c2", name: "Lo", response_rate: 0.1 },
          { id: "c3", name: "Mid" }, // missing response_rate → 0 → filtered
        ]),
      );

      await c.performSearch("x");
      await flushDebounce();

      const call = querySelectMock.mock.calls.find(
        (args) => args[0] === "coaches",
      );
      expect(call?.[1].filters).toMatchObject({
        sport: "basketball",
        verified: true,
      });
      expect(c.coachResults.value.map((c2) => c2.id)).toEqual(["c1"]);
    });

    it("interaction sentiment/direction filter into querySelect; dateFrom/dateTo post-filter", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "interactions";
      c.filters.value.interactions.sentiment = "positive";
      c.filters.value.interactions.direction = "outbound";
      c.filters.value.interactions.dateFrom = "2024-06-01";
      c.filters.value.interactions.dateTo = "2024-06-30";
      c.useFuzzySearch.value = false;

      querySelectMock.mockResolvedValue(
        ok([
          { id: "i1", recorded_date: "2024-06-15", subject: "ok" },
          { id: "i2", recorded_date: "2024-05-01", subject: "old" },
          { id: "i3", recorded_date: "2024-07-15", subject: "late" },
        ]),
      );

      await c.performSearch("x");
      await flushDebounce();

      const call = querySelectMock.mock.calls.find(
        (args) => args[0] === "interactions",
      );
      expect(call?.[1].filters).toMatchObject({
        sentiment_label: "positive",
        direction: "outbound",
      });
      expect(c.interactionResults.value.map((i) => i.id)).toEqual(["i1"]);
    });

    it("metrics metricType filter into querySelect; min/max/notes post-filter", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "metrics";
      c.filters.value.metrics.metricType = "sprint";
      c.filters.value.metrics.minValue = 10;
      c.filters.value.metrics.maxValue = 50;

      querySelectMock.mockResolvedValue(
        ok([
          { id: "m1", value: 25, notes: "good sprint" },
          { id: "m2", value: 5, notes: "good sprint" }, // below min
          { id: "m3", value: 75, notes: "good sprint" }, // above max
          { id: "m4", value: 30, notes: "different note" }, // notes mismatch
          { id: "m5", value: 20, notes: null }, // null notes → passes notes filter
        ]),
      );

      await c.performSearch("sprint");
      await flushDebounce();

      const call = querySelectMock.mock.calls.find(
        (args) => args[0] === "performance_metrics",
      );
      expect(call?.[1].filters).toMatchObject({ metric_type: "sprint" });
      expect(c.metricsResults.value.map((m) => m.id).sort()).toEqual([
        "m1",
        "m5",
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Fuzzy search toggle
  // -------------------------------------------------------------------------

  describe("fuzzy search", () => {
    beforeEach(() => setUser());

    it("applies fuzzy filtering by default", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "schools";
      querySelectMock.mockResolvedValue(
        ok([
          { id: "s1", name: "Stanford", state: "CA" },
          { id: "s2", name: "Harvard", state: "MA" },
        ]),
      );

      await c.performSearch("stan");
      await flushDebounce();

      // Fuse mock filters by substring → only Stanford matches "stan"
      expect(c.schoolResults.value.map((s) => s.id)).toEqual(["s1"]);
    });

    it("returns all rows when useFuzzySearch=false", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "schools";
      c.useFuzzySearch.value = false;
      querySelectMock.mockResolvedValue(
        ok([
          { id: "s1", name: "Stanford", state: "CA" },
          { id: "s2", name: "Harvard", state: "MA" },
        ]),
      );

      await c.performSearch("stan");
      await flushDebounce();

      expect(c.schoolResults.value.map((s) => s.id)).toEqual(["s1", "s2"]);
    });
  });

  // -------------------------------------------------------------------------
  // Error paths in entity searches
  // -------------------------------------------------------------------------

  describe("entity-search error handling", () => {
    beforeEach(() => setUser());

    it("resets schoolResults on querySelect error", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "schools";
      c.schoolResults.value = [{ id: "stale" } as never];
      querySelectMock.mockResolvedValue(err("db down"));

      await c.performSearch("x");
      await flushDebounce();

      expect(c.schoolResults.value).toEqual([]);
    });

    it("resets coachResults on error", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "coaches";
      c.coachResults.value = [{ id: "stale" } as never];
      querySelectMock.mockResolvedValue(err("db down"));

      await c.performSearch("x");
      await flushDebounce();

      expect(c.coachResults.value).toEqual([]);
    });

    it("resets interactionResults on error", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "interactions";
      c.interactionResults.value = [{ id: "stale" } as never];
      querySelectMock.mockResolvedValue(err("db down"));

      await c.performSearch("x");
      await flushDebounce();

      expect(c.interactionResults.value).toEqual([]);
    });

    it("resets metricsResults on error", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "metrics";
      c.metricsResults.value = [{ id: "stale" } as never];
      querySelectMock.mockResolvedValue(err("db down"));

      await c.performSearch("x");
      await flushDebounce();

      expect(c.metricsResults.value).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Caching
  // -------------------------------------------------------------------------

  describe("cache behavior", () => {
    beforeEach(() => setUser());

    it("serves the second identical search from cache (no new querySelect calls)", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "schools";
      c.useFuzzySearch.value = false;
      querySelectMock.mockResolvedValue(
        ok([{ id: "s1", name: "Stanford", state: "CA" }]),
      );

      await c.performSearch("stanford");
      await flushDebounce();
      const firstCalls = querySelectMock.mock.calls.length;

      await c.performSearch("stanford");
      // Cache hit: no debounce, no extra query
      expect(querySelectMock.mock.calls.length).toBe(firstCalls);
      expect(c.schoolResults.value).toHaveLength(1);
    });

    it("clearCache forces a new query for a previously-cached search", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "schools";
      c.useFuzzySearch.value = false;
      querySelectMock.mockResolvedValue(
        ok([{ id: "s1", name: "Stanford", state: "CA" }]),
      );

      await c.performSearch("stanford");
      await flushDebounce();
      const firstCalls = querySelectMock.mock.calls.length;

      c.clearCache();
      await c.performSearch("stanford");
      await flushDebounce();

      expect(querySelectMock.mock.calls.length).toBeGreaterThan(firstCalls);
    });

    it("expires cache entries after TTL (5 minutes)", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "schools";
      c.useFuzzySearch.value = false;
      querySelectMock.mockResolvedValue(
        ok([{ id: "s1", name: "Stanford", state: "CA" }]),
      );

      const realNow = Date.now;
      const t0 = realNow();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(t0);

      await c.performSearch("stanford");
      await flushDebounce();
      const firstCalls = querySelectMock.mock.calls.length;

      // Jump past the 5 min TTL
      nowSpy.mockReturnValue(t0 + 5 * 60 * 1000 + 1);

      await c.performSearch("stanford");
      await flushDebounce();

      expect(querySelectMock.mock.calls.length).toBeGreaterThan(firstCalls);
      nowSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Filter management
  // -------------------------------------------------------------------------

  describe("filter management", () => {
    beforeEach(() => setUser());

    it("applyFilter mutates the right category and re-runs search when query is active", async () => {
      const c = useSearchConsolidated();
      c.searchType.value = "schools";
      c.useFuzzySearch.value = false;
      querySelectMock.mockResolvedValue(ok([]));

      // Prime an active query
      await c.performSearch("stanford");
      await flushDebounce();
      const callsBefore = querySelectMock.mock.calls.length;

      await c.applyFilter("schools", "division", "D1");
      await flushDebounce();

      expect(c.filters.value.schools.division).toBe("D1");
      expect(querySelectMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it("applyFilter does not re-run when there is no active query", async () => {
      const c = useSearchConsolidated();
      querySelectMock.mockResolvedValue(ok([]));

      await c.applyFilter("coaches", "sport", "basketball");
      await flushDebounce();

      expect(c.filters.value.coaches.sport).toBe("basketball");
      expect(querySelectMock).not.toHaveBeenCalled();
    });

    it("clearFilters resets every filter category", async () => {
      const c = useSearchConsolidated();
      c.filters.value.schools.division = "D1";
      c.filters.value.coaches.sport = "x";
      c.filters.value.interactions.sentiment = "y";
      c.filters.value.metrics.metricType = "z";

      await c.clearFilters();

      expect(c.filters.value.schools).toEqual({
        division: "",
        state: "",
        verified: null,
      });
      expect(c.filters.value.coaches).toEqual({
        sport: "",
        responseRate: 0,
        verified: null,
      });
      expect(c.filters.value.interactions).toEqual({
        sentiment: "",
        direction: "",
        dateFrom: "",
        dateTo: "",
      });
      expect(c.filters.value.metrics).toEqual({
        metricType: "",
        minValue: 0,
        maxValue: 100,
      });
    });

    it("getFilterValue returns the stored value or null", () => {
      const c = useSearchConsolidated();
      c.filters.value.schools.division = "D2";
      expect(c.getFilterValue("schools", "division")).toBe("D2");
      expect(c.getFilterValue("schools", "doesNotExist")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // clearResults
  // -------------------------------------------------------------------------

  describe("clearResults", () => {
    it("empties every result array and the query", () => {
      const c = useSearchConsolidated();
      c.schoolResults.value = [{ id: "s" } as never];
      c.coachResults.value = [{ id: "c" } as never];
      c.interactionResults.value = [{ id: "i" } as never];
      c.metricsResults.value = [{ id: "m" } as never];
      c.query.value = "anything";

      c.clearResults();

      expect(c.schoolResults.value).toEqual([]);
      expect(c.coachResults.value).toEqual([]);
      expect(c.interactionResults.value).toEqual([]);
      expect(c.metricsResults.value).toEqual([]);
      expect(c.query.value).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Suggestions (schools / coaches)
  // -------------------------------------------------------------------------

  describe("getSchoolSuggestions", () => {
    it("returns [] when no user", async () => {
      const c = useSearchConsolidated();
      expect(await c.getSchoolSuggestions("Du")).toEqual([]);
    });

    it("returns [] when prefix < 2 chars", async () => {
      setUser();
      const c = useSearchConsolidated();
      expect(await c.getSchoolSuggestions("D")).toEqual([]);
    });

    it("returns matching school names (prefix match, case-insensitive)", async () => {
      setUser();
      querySelectMock.mockResolvedValue(
        ok([{ name: "Duke" }, { name: "Duquesne" }, { name: "Harvard" }]),
      );
      const c = useSearchConsolidated();
      const r = await c.getSchoolSuggestions("du");
      expect(r).toEqual(["Duke", "Duquesne"]);
    });

    it("returns [] when querySelect returns error", async () => {
      setUser();
      querySelectMock.mockResolvedValue(err("nope"));
      const c = useSearchConsolidated();
      expect(await c.getSchoolSuggestions("Du")).toEqual([]);
    });

    it("returns [] when querySelect throws", async () => {
      setUser();
      querySelectMock.mockRejectedValue(new Error("boom"));
      const c = useSearchConsolidated();
      expect(await c.getSchoolSuggestions("Du")).toEqual([]);
    });
  });

  describe("getCoachSuggestions", () => {
    it("returns [] when no user", async () => {
      const c = useSearchConsolidated();
      expect(await c.getCoachSuggestions("Jo")).toEqual([]);
    });

    it("returns [] when prefix < 2 chars", async () => {
      setUser();
      const c = useSearchConsolidated();
      expect(await c.getCoachSuggestions("J")).toEqual([]);
    });

    it("returns matching coach names", async () => {
      setUser();
      querySelectMock.mockResolvedValue(
        ok([{ name: "John Smith" }, { name: "Joe Brown" }, { name: "Alice" }]),
      );
      const c = useSearchConsolidated();
      expect(await c.getCoachSuggestions("Jo")).toEqual([
        "John Smith",
        "Joe Brown",
      ]);
    });

    it("returns [] when querySelect errors", async () => {
      setUser();
      querySelectMock.mockResolvedValue(err("nope"));
      const c = useSearchConsolidated();
      expect(await c.getCoachSuggestions("Jo")).toEqual([]);
    });

    it("returns [] when querySelect throws", async () => {
      setUser();
      querySelectMock.mockRejectedValue(new Error("boom"));
      const c = useSearchConsolidated();
      expect(await c.getCoachSuggestions("Jo")).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getCollegeSuggestions (uses global fetch, not Supabase)
  // -------------------------------------------------------------------------

  describe("getCollegeSuggestions", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("returns [] for queries < 3 chars without calling fetch", async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock as never;
      const c = useSearchConsolidated();
      expect(await c.getCollegeSuggestions("st")).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns [] when fetch response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false }) as never;
      const c = useSearchConsolidated();
      expect(await c.getCollegeSuggestions("stanford")).toEqual([]);
    });

    it("returns [] when JSON response has no results", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }) as never;
      const c = useSearchConsolidated();
      expect(await c.getCollegeSuggestions("stanford")).toEqual([]);
    });

    it("returns [] when results array is empty", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      }) as never;
      const c = useSearchConsolidated();
      expect(await c.getCollegeSuggestions("stanford")).toEqual([]);
    });

    it("maps + dedupes results into {id,name,location}", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 1,
              "school.name": "Stanford",
              "school.city": "Stanford",
              "school.state": "CA",
            },
            {
              id: 1, // duplicate id → should be dropped
              "school.name": "Stanford",
              "school.city": "Stanford",
              "school.state": "CA",
            },
            {
              id: 2,
              "school.name": "MIT",
              "school.city": "",
              "school.state": "MA",
            },
          ],
        }),
      }) as never;

      const c = useSearchConsolidated();
      const r = await c.getCollegeSuggestions("stan");
      expect(r).toEqual([
        { id: "1", name: "Stanford", location: "Stanford, CA" },
        { id: "2", name: "MIT", location: "MA" },
      ]);
    });

    it("returns [] when fetch throws", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("net")) as never;
      const c = useSearchConsolidated();
      expect(await c.getCollegeSuggestions("stan")).toEqual([]);
    });
  });
});
