import { describe, it, expect, beforeEach, vi } from "vitest";

// Records the size of each `.in("school_id", [...])` call so we can assert
// fetchCoaches chunks large families instead of building one over-long URL.
const inCallSizes: number[] = [];
let chunkError: { message: string } | null = null;
// 0-based index of a single chunk to fail (partial-failure tests); null = none.
let failNthChunk: number | null = null;

const mockSupabase = { from: vi.fn() };

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

import { useDashboardData } from "~/composables/useDashboardData";

const makeIds = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `school-${i}`);

beforeEach(() => {
  inCallSizes.length = 0;
  chunkError = null;
  failNthChunk = null;
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});

  mockSupabase.from.mockImplementation(() => ({
    select: () => ({
      in: (_col: string, vals: string[]) => {
        const idx = inCallSizes.length;
        inCallSizes.push(vals.length);
        const errored =
          chunkError ??
          (failNthChunk === idx ? { message: "Bad Request" } : null);
        // One coach per school id so merged count == total ids.
        return Promise.resolve({
          data: errored ? null : vals.map((id) => ({ id: `coach-${id}` })),
          error: errored,
        });
      },
    }),
  }));
});

describe("useDashboardData.fetchCoaches chunking", () => {
  it("issues a single query when school count is within one chunk", async () => {
    const { fetchCoaches, allCoaches, coachCount } = useDashboardData();
    await fetchCoaches(makeIds(150));

    expect(inCallSizes).toEqual([150]);
    expect(coachCount.value).toBe(150);
    expect(allCoaches.value).toHaveLength(150);
  });

  it("splits large families into 150-id chunks and merges results", async () => {
    const { fetchCoaches, allCoaches, coachCount } = useDashboardData();
    await fetchCoaches(makeIds(350));

    // 350 ids -> 150 + 150 + 50
    expect(inCallSizes).toEqual([150, 150, 50]);
    expect(coachCount.value).toBe(350);
    expect(allCoaches.value).toHaveLength(350);
  });

  it("makes no query and empties state when there are no schools", async () => {
    const { fetchCoaches, allCoaches, coachCount } = useDashboardData();
    await fetchCoaches([]);

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(inCallSizes).toEqual([]);
    expect(coachCount.value).toBe(0);
    expect(allCoaches.value).toEqual([]);
  });

  it("degrades gracefully: one failing chunk keeps the successful chunks, no throw", async () => {
    failNthChunk = 0; // first of two 150-id chunks fails
    const { fetchCoaches, allCoaches, coachCount } = useDashboardData();

    // Must not throw — a partial coaches failure can't blank the dashboard.
    await expect(fetchCoaches(makeIds(300))).resolves.toBeUndefined();

    // Second chunk's 150 coaches survive; the failed chunk is simply omitted.
    expect(coachCount.value).toBe(150);
    expect(allCoaches.value).toHaveLength(150);
  });

  it("empties coaches without throwing when every chunk errors", async () => {
    chunkError = { message: "Bad Request" };
    const { fetchCoaches, allCoaches, coachCount } = useDashboardData();

    await expect(fetchCoaches(makeIds(300))).resolves.toBeUndefined();
    expect(coachCount.value).toBe(0);
    expect(allCoaches.value).toEqual([]);
  });
});

describe("useDashboardData.fetchAll — no stale flash on athlete switch", () => {
  // Per-table canned responses, keyed by whichever entity table fetchAll's
  // fetchX() hits. Every fetchX ends the chain with .eq() (schools/offers/
  // events), .in() (coaches), or .limit() (interactions/metrics). The chain
  // is thenable so `await query.eq()` still works for terminals that don't
  // call .limit().
  const tableResponses: Record<
    string,
    { data: unknown[] | null; error: unknown; count?: number }
  > = {};
  const selectCalls: Array<{ table: string; args: unknown[] }> = [];
  const orderCalls: Array<{ table: string; args: unknown[] }> = [];
  const limitCalls: Array<{ table: string; args: unknown[] }> = [];

  const makeResult = (table: string) =>
    Promise.resolve({
      data: tableResponses[table]?.data ?? [],
      error: tableResponses[table]?.error ?? null,
      count: tableResponses[table]?.count,
    });

  const makeChain = (table: string, result: Promise<unknown>) => {
    const chain: Record<string, unknown> = {};
    chain.eq = () => chain;
    chain.in = () => result;
    chain.order = (...args: unknown[]) => {
      orderCalls.push({ table, args });
      return chain;
    };
    chain.limit = (...args: unknown[]) => {
      limitCalls.push({ table, args });
      return result;
    };
    chain.then = (onFulfilled: unknown, onRejected: unknown) =>
      result.then(onFulfilled as never, onRejected as never);
    return chain;
  };

  beforeEach(() => {
    Object.keys(tableResponses).forEach((k) => delete tableResponses[k]);
    selectCalls.length = 0;
    orderCalls.length = 0;
    limitCalls.length = 0;
    tableResponses.schools = { data: [{ id: "school-old" }], error: null };
    tableResponses.coaches = { data: [{ id: "coach-old" }], error: null };
    tableResponses.interactions = {
      data: [{ id: "int-old" }],
      error: null,
      count: 1,
    };
    tableResponses.offers = { data: [{ id: "offer-old" }], error: null };
    tableResponses.events = { data: [{ id: "event-old" }], error: null };
    tableResponses.performance_metrics = {
      data: [{ id: "metric-old" }],
      error: null,
    };

    mockSupabase.from.mockImplementation((table: string) => {
      const result = makeResult(table);
      return {
        select: (...args: unknown[]) => {
          selectCalls.push({ table, args });
          return makeChain(table, result);
        },
      };
    });
  });

  it("clears all entity arrays synchronously, before the new fetch resolves", async () => {
    const dashboardData = useDashboardData();

    // Simulate athlete #1's data already loaded.
    await dashboardData.fetchAll("family-old", "athlete-old");
    expect(dashboardData.allSchools.value).toEqual([{ id: "school-old" }]);
    expect(dashboardData.allOffers.value).toEqual([{ id: "offer-old" }]);

    // Athlete switch: point every table at athlete #2's (still-loading) data.
    tableResponses.schools = { data: [{ id: "school-new" }], error: null };
    tableResponses.offers = { data: [{ id: "offer-new" }], error: null };

    const pending = dashboardData.fetchAll("family-new", "athlete-new");

    // Before the new fetch has resolved, prior athlete's data must already
    // be gone — not still showing while loading ("stale flash").
    expect(dashboardData.allSchools.value).toEqual([]);
    expect(dashboardData.allOffers.value).toEqual([]);
    expect(dashboardData.allCoaches.value).toEqual([]);
    expect(dashboardData.allInteractions.value).toEqual([]);
    expect(dashboardData.allEvents.value).toEqual([]);
    expect(dashboardData.allMetrics.value).toEqual([]);

    await pending;

    expect(dashboardData.allSchools.value).toEqual([{ id: "school-new" }]);
    expect(dashboardData.allOffers.value).toEqual([{ id: "offer-new" }]);
  });

  it("does not leave the previous athlete's offers visible when the offers query errors without throwing", async () => {
    const dashboardData = useDashboardData();

    await dashboardData.fetchAll("family-old", "athlete-old");
    expect(dashboardData.allOffers.value).toEqual([{ id: "offer-old" }]);

    // fetchOffers swallows its own error (`if (!offersError && offersData)`)
    // rather than throwing — previously this left the prior athlete's
    // offers in place with no error surfaced.
    tableResponses.offers = {
      data: null,
      error: { message: "RLS denied" },
    };

    await dashboardData.fetchAll("family-new", "athlete-new");

    expect(dashboardData.allOffers.value).toEqual([]);
  });

  it("discards an older, slower fetchAll() call's data when a newer fetchAll() already applied its result (latest-wins)", async () => {
    const dashboardData = useDashboardData();

    // Make fetchSchools controllable per-call so we can resolve the two
    // fetchAll() invocations out of order.
    const schoolResolvers: Array<
      (v: { data: unknown[]; error: null }) => void
    > = [];
    mockSupabase.from.mockImplementation((table: string) => {
      const result =
        table === "schools"
          ? new Promise((resolve) => schoolResolvers.push(resolve))
          : Promise.resolve({
              data: tableResponses[table]?.data ?? [],
              error: tableResponses[table]?.error ?? null,
              count: tableResponses[table]?.count,
            });
      const chain: Record<string, unknown> = {
        eq: () => chain,
        in: () => result,
        order: () => chain,
        limit: () => result,
        then: (onFulfilled: unknown, onRejected: unknown) =>
          result.then(onFulfilled as never, onRejected as never),
      };
      return { select: () => chain };
    });

    // Dispatch A (older), then dispatch B (newer) before A resolves.
    const fetchA = dashboardData.fetchAll("family-a", "athlete-a");
    const fetchB = dashboardData.fetchAll("family-b", "athlete-b");
    expect(schoolResolvers).toHaveLength(2);

    // Resolve B first (the newer request wins), then A late.
    schoolResolvers[1]({ data: [{ id: "school-b" }], error: null });
    await fetchB;

    schoolResolvers[0]({ data: [{ id: "school-a" }], error: null });
    await fetchA;

    expect(dashboardData.allSchools.value).toEqual([{ id: "school-b" }]);
  });

  it("does not select * for interactions — only widget columns, newest first, capped", async () => {
    const { fetchAll } = useDashboardData();
    await fetchAll("family-1", "athlete-1");

    const interactionSelect = selectCalls.find(
      (c) => c.table === "interactions",
    );
    expect(interactionSelect).toBeDefined();
    expect(String(interactionSelect?.args[0])).not.toBe("*");
    expect(String(interactionSelect?.args[0])).toContain("occurred_at");
    expect(String(interactionSelect?.args[0])).not.toContain("content");
    expect(interactionSelect?.args[1]).toEqual({ count: "exact" });

    const interactionOrder = orderCalls.find((c) => c.table === "interactions");
    expect(interactionOrder?.args[0]).toBe("occurred_at");
    expect(interactionOrder?.args[1]).toEqual({ ascending: false });

    const { DASHBOARD_INTERACTION_LIMIT } =
      await import("~/composables/useDashboardData");
    const interactionLimit = limitCalls.find((c) => c.table === "interactions");
    expect(interactionLimit?.args[0]).toBe(DASHBOARD_INTERACTION_LIMIT);
  });

  it("omits heavy school text columns (notes, philosophy) from the dashboard fetch", async () => {
    const { fetchAll } = useDashboardData();
    await fetchAll("family-1", "athlete-1");

    const schoolSelect = selectCalls.find((c) => c.table === "schools");
    const cols = String(schoolSelect?.args[0]);
    expect(cols).toContain("academic_info");
    expect(cols).toContain("status");
    expect(cols).not.toContain("coaching_philosophy");
    expect(cols).not.toContain("notes");
    expect(cols).not.toContain("amenities");
  });

  it("caps performance metrics to a recency window", async () => {
    const { fetchAll } = useDashboardData();
    await fetchAll("family-1", "athlete-1");

    const { DASHBOARD_METRIC_LIMIT } =
      await import("~/composables/useDashboardData");
    const metricLimit = limitCalls.find(
      (c) => c.table === "performance_metrics",
    );
    expect(metricLimit?.args[0]).toBe(DASHBOARD_METRIC_LIMIT);
  });
});
