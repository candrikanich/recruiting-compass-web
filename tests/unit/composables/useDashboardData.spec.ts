import { describe, it, expect, beforeEach, vi } from "vitest";

// Records the size of each `.in("school_id", [...])` call so we can assert
// fetchCoaches chunks large families instead of building one over-long URL.
const inCallSizes: number[] = [];
let chunkError: { message: string } | null = null;

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
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});

  mockSupabase.from.mockImplementation(() => ({
    select: () => ({
      in: (_col: string, vals: string[]) => {
        inCallSizes.push(vals.length);
        // One coach per school id so merged count == total ids.
        return Promise.resolve({
          data: chunkError ? null : vals.map((id) => ({ id: `coach-${id}` })),
          error: chunkError,
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

  it("throws if any chunk query errors", async () => {
    chunkError = { message: "Bad Request" };
    const { fetchCoaches } = useDashboardData();

    await expect(fetchCoaches(makeIds(300))).rejects.toMatchObject({
      message: "Bad Request",
    });
  });
});

describe("useDashboardData.fetchAll — no stale flash on athlete switch", () => {
  // Per-table canned responses, keyed by whichever entity table fetchAll's
  // fetchX() hits. Every fetchX ends the chain with a single .eq() (or .in()
  // for coaches), so a generic select().eq()/in() resolver covers all of them.
  const tableResponses: Record<
    string,
    { data: unknown[] | null; error: unknown; count?: number }
  > = {};

  beforeEach(() => {
    Object.keys(tableResponses).forEach((k) => delete tableResponses[k]);
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

    mockSupabase.from.mockImplementation((table: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: tableResponses[table]?.data ?? [],
            error: tableResponses[table]?.error ?? null,
            count: tableResponses[table]?.count,
          }),
        in: () =>
          Promise.resolve({
            data: tableResponses[table]?.data ?? [],
            error: tableResponses[table]?.error ?? null,
          }),
      }),
    }));
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
    mockSupabase.from.mockImplementation((table: string) => ({
      select: () => ({
        eq: () => {
          if (table === "schools") {
            return new Promise((resolve) => schoolResolvers.push(resolve));
          }
          return Promise.resolve({
            data: tableResponses[table]?.data ?? [],
            error: tableResponses[table]?.error ?? null,
            count: tableResponses[table]?.count,
          });
        },
        in: () =>
          Promise.resolve({
            data: tableResponses[table]?.data ?? [],
            error: tableResponses[table]?.error ?? null,
          }),
      }),
    }));

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
});
