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
