import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePerformanceConsolidated } from "~/composables/usePerformanceConsolidated";
import { setActivePinia, createPinia } from "pinia";
import type { Performance, PerformanceMetric } from "~/types/models";

/**
 * Extended coverage spec for usePerformanceConsolidated.
 * Targets uncovered branches identified by v8 coverage:
 *   - fetchMetrics filter branches & error path
 *   - createMetric/updateMetric/deleteMetric unauthenticated + error paths
 *   - metricsByType / latestMetrics with actual data
 *   - calculateTrend (declining/stable), calculatePercentChange (zero divisor)
 *   - filterByDateRange, comparePeriods, groupByPeriod (weekly/monthly)
 *   - projectPerformance, calculateRegressionLine, calculateCorrelation edge cases
 *   - groupByCategory empty/missing field, calculateFunnelMetrics empty/zero total
 */

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

let mockUser: { id: string; email: string } | null = {
  id: "user-123",
  email: "test@example.com",
};

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get user() {
      return mockUser;
    },
    isAuthenticated: true,
  }),
}));

interface MockQuery {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  __setTestData: (data: unknown) => void;
  __setTestError: (err: unknown) => void;
  then?: unknown;
}

const buildMockQuery = (): MockQuery => {
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
  } as unknown as MockQuery;

  const state: { data: unknown; error: unknown } = { data: [], error: null };

  Object.defineProperty(q, "then", {
    value: (
      onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(state).then(onFulfilled, onRejected),
    writable: true,
    configurable: true,
  });

  q.__setTestData = (data: unknown) => {
    state.data = data;
    state.error = null;
  };
  q.__setTestError = (err: unknown) => {
    state.data = null;
    state.error = err;
  };

  return q;
};

const createMockMetric = (
  overrides: Partial<PerformanceMetric> = {},
): PerformanceMetric => ({
  id: "metric-123",
  user_id: "user-123",
  event_id: null,
  metric_type: "exit_velo",
  value: 85,
  unit: "mph",
  recorded_date: "2024-01-01T12:00:00Z",
  verified: false,
  created_at: "2024-01-01T12:00:00Z",
  updated_at: "2024-01-01T12:00:00Z",
  ...overrides,
});

const makePerf = (created_at: string, value: number): Performance =>
  createMockMetric({
    id: `perf-${created_at}-${value}`,
    created_at,
    value,
  }) as Performance;

describe("usePerformanceConsolidated (extended)", () => {
  let mockQuery: MockQuery;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockUser = { id: "user-123", email: "test@example.com" };
    mockQuery = buildMockQuery();
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  // ==========================================================================
  // fetchMetrics — filter branches and error path
  // ==========================================================================

  describe("fetchMetrics filter branches", () => {
    it("applies metricType filter", async () => {
      const { fetchMetrics } = usePerformanceConsolidated();
      await fetchMetrics({ metricType: "exit_velo" });
      expect(mockQuery.eq).toHaveBeenCalledWith("metric_type", "exit_velo");
    });

    it("applies eventId filter", async () => {
      const { fetchMetrics } = usePerformanceConsolidated();
      await fetchMetrics({ eventId: "evt-1" });
      expect(mockQuery.eq).toHaveBeenCalledWith("event_id", "evt-1");
    });

    it("applies startDate filter via gte", async () => {
      const { fetchMetrics } = usePerformanceConsolidated();
      await fetchMetrics({ startDate: "2024-01-01" });
      expect(mockQuery.gte).toHaveBeenCalled();
      const call = mockQuery.gte.mock.calls[0];
      expect(call[0]).toBe("recorded_date");
      expect(typeof call[1]).toBe("string");
    });

    it("applies endDate filter via lte", async () => {
      const { fetchMetrics } = usePerformanceConsolidated();
      await fetchMetrics({ endDate: "2024-12-31" });
      expect(mockQuery.lte).toHaveBeenCalled();
    });

    it("applies all filters combined", async () => {
      const { fetchMetrics } = usePerformanceConsolidated();
      await fetchMetrics({
        metricType: "velocity",
        eventId: "evt-2",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      expect(mockQuery.eq).toHaveBeenCalledWith("metric_type", "velocity");
      expect(mockQuery.eq).toHaveBeenCalledWith("event_id", "evt-2");
      expect(mockQuery.gte).toHaveBeenCalled();
      expect(mockQuery.lte).toHaveBeenCalled();
    });

    it("captures Error.message on fetch failure", async () => {
      mockQuery.__setTestError(new Error("DB down"));
      const { fetchMetrics, error, loading } = usePerformanceConsolidated();
      await fetchMetrics();
      expect(error.value).toBe("DB down");
      expect(loading.value).toBe(false);
    });

    it("falls back to default message for non-Error throws", async () => {
      mockQuery.__setTestError({ weird: "thing" });
      const { fetchMetrics, error } = usePerformanceConsolidated();
      await fetchMetrics();
      expect(error.value).toBe("Failed to fetch metrics");
    });
  });

  // ==========================================================================
  // createMetric — unauth + error paths
  // ==========================================================================

  describe("createMetric auth + errors", () => {
    it("throws when user not authenticated", async () => {
      mockUser = null;
      const { createMetric } = usePerformanceConsolidated();
      await expect(
        createMetric({
          event_id: null,
          metric_type: "exit_velo",
          value: 90,
          unit: "mph",
          recorded_date: "2024-01-01T00:00:00Z",
          verified: false,
        } as Omit<PerformanceMetric, "id" | "created_at" | "updated_at">),
      ).rejects.toThrow("User not authenticated");
    });

    it("propagates insertError with message", async () => {
      mockQuery.__setTestError(new Error("Insert failed"));
      const { createMetric, error } = usePerformanceConsolidated();
      await expect(
        createMetric({
          event_id: null,
          metric_type: "exit_velo",
          value: 90,
          unit: "mph",
          recorded_date: "2024-01-01T00:00:00Z",
          verified: false,
        } as Omit<PerformanceMetric, "id" | "created_at" | "updated_at">),
      ).rejects.toThrow("Insert failed");
      expect(error.value).toBe("Insert failed");
    });

    it("falls back to default message on non-Error insert throw", async () => {
      mockQuery.__setTestError("weird-string");
      const { createMetric, error } = usePerformanceConsolidated();
      await expect(
        createMetric({
          event_id: null,
          metric_type: "exit_velo",
          value: 90,
          unit: "mph",
          recorded_date: "2024-01-01T00:00:00Z",
          verified: false,
        } as Omit<PerformanceMetric, "id" | "created_at" | "updated_at">),
      ).rejects.toBeDefined();
      expect(error.value).toBe("Failed to create metric");
    });
  });

  // ==========================================================================
  // updateMetric — auth, error, and index update branch
  // ==========================================================================

  describe("updateMetric auth + errors", () => {
    it("throws when user not authenticated", async () => {
      mockUser = null;
      const { updateMetric } = usePerformanceConsolidated();
      await expect(updateMetric("m-1", { value: 50 })).rejects.toThrow(
        "User not authenticated",
      );
    });

    it("replaces metric at matching index", async () => {
      const original = createMockMetric({ id: "m-1", value: 80 });
      mockQuery.__setTestData([original]);
      const composable = usePerformanceConsolidated();
      await composable.fetchMetrics();
      expect(composable.metrics.value).toHaveLength(1);

      const updated = createMockMetric({ id: "m-1", value: 95 });
      mockQuery.__setTestData(updated);
      const result = await composable.updateMetric("m-1", { value: 95 });
      expect(result.value).toBe(95);
      expect(composable.metrics.value[0].value).toBe(95);
    });

    it("does not modify metrics when id not present", async () => {
      const other = createMockMetric({ id: "other", value: 80 });
      mockQuery.__setTestData([other]);
      const composable = usePerformanceConsolidated();
      await composable.fetchMetrics();

      const updated = createMockMetric({ id: "m-1", value: 95 });
      mockQuery.__setTestData(updated);
      await composable.updateMetric("m-1", { value: 95 });
      expect(composable.metrics.value[0].value).toBe(80);
    });

    it("propagates updateError with message", async () => {
      mockQuery.__setTestError(new Error("Update failed"));
      const { updateMetric, error } = usePerformanceConsolidated();
      await expect(updateMetric("m-1", { value: 1 })).rejects.toThrow(
        "Update failed",
      );
      expect(error.value).toBe("Update failed");
    });

    it("falls back to default message on non-Error update throw", async () => {
      mockQuery.__setTestError({ code: "x" });
      const { updateMetric, error } = usePerformanceConsolidated();
      await expect(updateMetric("m-1", { value: 1 })).rejects.toBeDefined();
      expect(error.value).toBe("Failed to update metric");
    });
  });

  // ==========================================================================
  // deleteMetric — auth + error
  // ==========================================================================

  describe("deleteMetric auth + errors", () => {
    it("throws when user not authenticated", async () => {
      mockUser = null;
      const { deleteMetric } = usePerformanceConsolidated();
      await expect(deleteMetric("m-1")).rejects.toThrow(
        "User not authenticated",
      );
    });

    it("propagates deleteError with message", async () => {
      mockQuery.__setTestError(new Error("Delete failed"));
      const { deleteMetric, error } = usePerformanceConsolidated();
      await expect(deleteMetric("m-1")).rejects.toThrow("Delete failed");
      expect(error.value).toBe("Delete failed");
    });

    it("falls back to default message on non-Error delete throw", async () => {
      mockQuery.__setTestError(42);
      const { deleteMetric, error } = usePerformanceConsolidated();
      await expect(deleteMetric("m-1")).rejects.toBeDefined();
      expect(error.value).toBe("Failed to delete metric");
    });
  });

  // ==========================================================================
  // Computed properties — populated state
  // ==========================================================================

  describe("metricsByType / latestMetrics with data", () => {
    it("groups metrics by metric_type", async () => {
      mockQuery.__setTestData([
        createMockMetric({ id: "a", metric_type: "exit_velo" }),
        createMockMetric({ id: "b", metric_type: "exit_velo" }),
        createMockMetric({ id: "c", metric_type: "velocity" }),
      ]);
      const c = usePerformanceConsolidated();
      await c.fetchMetrics();
      expect(c.metricsByType.value.exit_velo).toHaveLength(2);
      expect(c.metricsByType.value.velocity).toHaveLength(1);
    });

    it("picks latest metric per type by recorded_date", async () => {
      mockQuery.__setTestData([
        createMockMetric({
          id: "old",
          metric_type: "exit_velo",
          value: 80,
          recorded_date: "2024-01-01T00:00:00Z",
        }),
        createMockMetric({
          id: "new",
          metric_type: "exit_velo",
          value: 95,
          recorded_date: "2024-06-01T00:00:00Z",
        }),
        createMockMetric({
          id: "v1",
          metric_type: "velocity",
          value: 70,
          recorded_date: "2024-03-01T00:00:00Z",
        }),
      ]);
      const c = usePerformanceConsolidated();
      await c.fetchMetrics();
      expect(c.latestMetrics.value.exit_velo.id).toBe("new");
      expect(c.latestMetrics.value.velocity.id).toBe("v1");
    });
  });

  // ==========================================================================
  // Analytics — edge cases & under-tested branches
  // ==========================================================================

  describe("calculateTrend edge cases", () => {
    it("returns stable for <2 entries", () => {
      const { calculateTrend } = usePerformanceConsolidated();
      expect(calculateTrend([], "value")).toBe("stable");
      expect(
        calculateTrend([makePerf("2024-01-01T00:00:00Z", 80)], "value"),
      ).toBe("stable");
    });

    it("returns declining when second half drops below threshold", () => {
      const { calculateTrend } = usePerformanceConsolidated();
      const perfs = [
        makePerf("2024-01-01T00:00:00Z", 95),
        makePerf("2024-01-02T00:00:00Z", 96),
        makePerf("2024-01-03T00:00:00Z", 80),
        makePerf("2024-01-04T00:00:00Z", 81),
      ];
      expect(calculateTrend(perfs, "value")).toBe("declining");
    });

    it("returns stable when change is within threshold", () => {
      const { calculateTrend } = usePerformanceConsolidated();
      const perfs = [
        makePerf("2024-01-01T00:00:00Z", 90),
        makePerf("2024-01-02T00:00:00Z", 90),
        makePerf("2024-01-03T00:00:00Z", 91),
        makePerf("2024-01-04T00:00:00Z", 91),
      ];
      expect(calculateTrend(perfs, "value")).toBe("stable");
    });
  });

  describe("calculatePercentChange edge cases", () => {
    it("returns 0 when oldValue is 0", () => {
      const { calculatePercentChange } = usePerformanceConsolidated();
      expect(calculatePercentChange(0, 100)).toBe(0);
    });

    it("returns negative percent on decrease", () => {
      const { calculatePercentChange } = usePerformanceConsolidated();
      expect(calculatePercentChange(100, 80)).toBe(-20);
    });
  });

  describe("filterByDateRange", () => {
    it("includes only items within range (inclusive bounds)", () => {
      const { filterByDateRange } = usePerformanceConsolidated();
      const perfs = [
        makePerf("2024-01-01T00:00:00Z", 1),
        makePerf("2024-06-01T00:00:00Z", 2),
        makePerf("2024-12-01T00:00:00Z", 3),
      ];
      const result = filterByDateRange(
        perfs,
        new Date("2024-05-01T00:00:00Z"),
        new Date("2024-11-01T00:00:00Z"),
      );
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(2);
    });

    it("handles missing created_at gracefully", () => {
      const { filterByDateRange } = usePerformanceConsolidated();
      const perfs = [
        {
          ...createMockMetric({ id: "noDate" }),
          created_at: undefined,
        } as unknown as Performance,
      ];
      // Date("") is Invalid; comparisons against Invalid yield false → filtered out
      const result = filterByDateRange(
        perfs,
        new Date("2020-01-01"),
        new Date("2030-01-01"),
      );
      expect(result).toHaveLength(0);
    });
  });

  describe("comparePeriods", () => {
    it("computes current/previous/change/changePercent", () => {
      const { comparePeriods } = usePerformanceConsolidated();
      const now = Date.now();
      const inLastWeek = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
      const inPrevWeek = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
      const perfs = [makePerf(inPrevWeek, 100), makePerf(inLastWeek, 150)];
      const result = comparePeriods(perfs, "value", 7);
      expect(result.currentPeriod).toBe(150);
      expect(result.previousPeriod).toBe(100);
      expect(result.change).toBe(50);
      expect(result.changePercent).toBe(50);
    });

    it("handles empty arrays", () => {
      const { comparePeriods } = usePerformanceConsolidated();
      const result = comparePeriods([], "value", 7);
      expect(result.currentPeriod).toBe(0);
      expect(result.previousPeriod).toBe(0);
      expect(result.change).toBe(0);
      expect(result.changePercent).toBe(0);
    });
  });

  describe("groupByPeriod weekly + monthly", () => {
    it("groups by week label", () => {
      const { groupByPeriod } = usePerformanceConsolidated();
      const perfs = [
        makePerf("2024-01-02T00:00:00Z", 1),
        makePerf("2024-01-05T00:00:00Z", 2),
        makePerf("2024-03-15T00:00:00Z", 3),
      ];
      const grouped = groupByPeriod(perfs, "weekly");
      const keys = Object.keys(grouped);
      expect(keys.every((k) => k.startsWith("Week "))).toBe(true);
      expect(keys.length).toBeGreaterThanOrEqual(2);
    });

    it("groups by YYYY-MM month label", () => {
      const { groupByPeriod } = usePerformanceConsolidated();
      const perfs = [
        makePerf("2024-01-15T00:00:00Z", 1),
        makePerf("2024-01-20T00:00:00Z", 2),
        makePerf("2024-02-10T00:00:00Z", 3),
      ];
      const grouped = groupByPeriod(perfs, "monthly");
      expect(grouped["2024-01"]).toHaveLength(2);
      expect(grouped["2024-02"]).toHaveLength(1);
    });
  });

  describe("projectPerformance", () => {
    it("returns average when fewer than 2 entries", () => {
      const { projectPerformance } = usePerformanceConsolidated();
      expect(projectPerformance([], "value")).toBe(0);
      const one = [makePerf("2024-01-01T00:00:00Z", 90)];
      expect(projectPerformance(one, "value")).toBe(90);
    });

    it("projects via linear regression on recent values", () => {
      const { projectPerformance } = usePerformanceConsolidated();
      const perfs = Array.from({ length: 5 }, (_, i) =>
        makePerf(`2024-01-0${i + 1}T00:00:00Z`, 80 + i * 2),
      );
      const projected = projectPerformance(perfs, "value", 7);
      expect(projected).toBeGreaterThan(0);
    });

    it("returns 0 when no numeric values are available", () => {
      const { projectPerformance } = usePerformanceConsolidated();
      const perfs = [
        {
          ...createMockMetric({ id: "n1" }),
          value: "abc" as unknown as number,
        },
        {
          ...createMockMetric({ id: "n2" }),
          value: "def" as unknown as number,
        },
      ] as unknown as Performance[];
      expect(projectPerformance(perfs, "value")).toBe(0);
    });

    it("clamps negative projections to 0", () => {
      const { projectPerformance } = usePerformanceConsolidated();
      const perfs = Array.from({ length: 5 }, (_, i) =>
        makePerf(`2024-01-0${i + 1}T00:00:00Z`, 100 - i * 50),
      );
      const projected = projectPerformance(perfs, "value", 365);
      expect(projected).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateCorrelation edge cases", () => {
    it("returns 0 for length mismatch", () => {
      const { calculateCorrelation } = usePerformanceConsolidated();
      expect(calculateCorrelation([1, 2], [1, 2, 3])).toBe(0);
    });

    it("returns 0 for <2 values", () => {
      const { calculateCorrelation } = usePerformanceConsolidated();
      expect(calculateCorrelation([], [])).toBe(0);
      expect(calculateCorrelation([1], [2])).toBe(0);
    });

    it("returns 0 when denominator is 0 (constant series)", () => {
      const { calculateCorrelation } = usePerformanceConsolidated();
      expect(calculateCorrelation([1, 1, 1], [2, 4, 6])).toBe(0);
    });

    it("returns -1 for perfect negative correlation", () => {
      const { calculateCorrelation } = usePerformanceConsolidated();
      expect(calculateCorrelation([1, 2, 3, 4], [4, 3, 2, 1])).toBe(-1);
    });
  });

  describe("calculateRegressionLine", () => {
    it("returns zeroed result for length mismatch", () => {
      const { calculateRegressionLine } = usePerformanceConsolidated();
      const result = calculateRegressionLine([1, 2], [1]);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
      expect(result.r2).toBe(0);
      expect(result.points).toEqual([]);
    });

    it("returns zeroed result for <2 points", () => {
      const { calculateRegressionLine } = usePerformanceConsolidated();
      const result = calculateRegressionLine([1], [1]);
      expect(result.slope).toBe(0);
      expect(result.points).toEqual([]);
    });

    it("computes slope/intercept/r2 + 11 line points for clean data", () => {
      const { calculateRegressionLine } = usePerformanceConsolidated();
      const result = calculateRegressionLine([1, 2, 3, 4], [2, 4, 6, 8]);
      expect(result.slope).toBe(2);
      expect(result.intercept).toBe(0);
      expect(result.r2).toBe(1);
      expect(result.points).toHaveLength(11);
    });

    it("handles ssTotal === 0 (constant y) without NaN", () => {
      const { calculateRegressionLine } = usePerformanceConsolidated();
      const result = calculateRegressionLine([1, 2, 3], [5, 5, 5]);
      expect(result.r2).toBe(0);
    });
  });

  describe("groupByCategory edge cases", () => {
    it("returns empty array for no items", () => {
      const { groupByCategory } = usePerformanceConsolidated();
      expect(groupByCategory([], "type" as never)).toEqual([]);
    });

    it("buckets missing categories under 'Other'", () => {
      const { groupByCategory } = usePerformanceConsolidated();
      const items = [
        { type: undefined },
        { type: null },
        { type: "A" },
      ] as Array<{ type: string | null | undefined }>;
      const result = groupByCategory(items, "type");
      const other = result.find((r) => r.label === "Other");
      expect(other?.value).toBe(2);
    });
  });

  describe("calculateFunnelMetrics edge cases", () => {
    it("returns empty array when no stages", () => {
      const { calculateFunnelMetrics } = usePerformanceConsolidated();
      expect(calculateFunnelMetrics([])).toEqual([]);
    });

    it("handles zero-count first stage (percentage falls back to 0)", () => {
      const { calculateFunnelMetrics } = usePerformanceConsolidated();
      const result = calculateFunnelMetrics([
        { label: "Top", count: 0 },
        { label: "Mid", count: 5 },
      ]);
      expect(result[0].percentage).toBe(0);
      expect(result[0].conversionRate).toBe(100);
      expect(result[1].conversionRate).toBe(0);
    });
  });
});
