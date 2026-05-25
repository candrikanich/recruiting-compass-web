import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { usePerformance } from "~/composables/usePerformance";
import type { PerformanceMetric } from "~/types/models";

/**
 * Unit-test coverage for composables/usePerformance.ts (the original, non-consolidated
 * version). Mirrors the chainable-mock pattern from usePerformanceConsolidated.extended.spec.ts.
 *
 * Targets every public method + computed (happy + error path):
 *   - fetchMetrics: filters, ordering, error capture (Error & non-Error), unauth no-op
 *   - createMetric: success, unauth throw, insertError, non-Error throw
 *   - updateMetric: success at index, missing-id no-op, unauth, updateError, non-Error throw
 *   - deleteMetric: success, unauth, deleteError, non-Error throw
 *   - computed: metrics, metricsByType, latestMetrics, loading, error
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

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
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

describe("usePerformance", () => {
  let mockQuery: MockQuery;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockUser = { id: "user-123", email: "test@example.com" };
    mockQuery = buildMockQuery();
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  // ==========================================================================
  // Initial state + computed wrappers
  // ==========================================================================

  describe("initial state", () => {
    it("exposes empty metrics, no loading, no error", () => {
      const c = usePerformance();
      expect(c.metrics.value).toEqual([]);
      expect(c.loading.value).toBe(false);
      expect(c.error.value).toBeNull();
      expect(c.metricsByType.value).toEqual({});
      expect(c.latestMetrics.value).toEqual({});
    });
  });

  // ==========================================================================
  // fetchMetrics
  // ==========================================================================

  describe("fetchMetrics", () => {
    it("no-ops silently when user is not signed in", async () => {
      mockUser = null;
      const c = usePerformance();
      await c.fetchMetrics();
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(c.loading.value).toBe(false);
      expect(c.error.value).toBeNull();
    });

    it("queries performance_metrics scoped to user and orders by recorded_date", async () => {
      mockQuery.__setTestData([createMockMetric()]);
      const c = usePerformance();
      await c.fetchMetrics();
      expect(mockSupabase.from).toHaveBeenCalledWith("performance_metrics");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockQuery.order).toHaveBeenCalledWith("recorded_date", {
        ascending: false,
      });
      expect(c.metrics.value).toHaveLength(1);
      expect(c.loading.value).toBe(false);
    });

    it("falls back to empty array when data is null", async () => {
      mockQuery.__setTestData(null);
      const c = usePerformance();
      await c.fetchMetrics();
      expect(c.metrics.value).toEqual([]);
    });

    it("applies metricType filter", async () => {
      const c = usePerformance();
      await c.fetchMetrics({ metricType: "exit_velo" });
      expect(mockQuery.eq).toHaveBeenCalledWith("metric_type", "exit_velo");
    });

    it("applies eventId filter", async () => {
      const c = usePerformance();
      await c.fetchMetrics({ eventId: "evt-9" });
      expect(mockQuery.eq).toHaveBeenCalledWith("event_id", "evt-9");
    });

    it("applies startDate via gte ISO string", async () => {
      const c = usePerformance();
      await c.fetchMetrics({ startDate: "2024-01-01" });
      expect(mockQuery.gte).toHaveBeenCalled();
      const [field, value] = mockQuery.gte.mock.calls[0];
      expect(field).toBe("recorded_date");
      expect(typeof value).toBe("string");
      expect(() => new Date(value as string)).not.toThrow();
    });

    it("applies endDate via lte ISO string", async () => {
      const c = usePerformance();
      await c.fetchMetrics({ endDate: "2024-12-31" });
      expect(mockQuery.lte).toHaveBeenCalled();
      const [field, value] = mockQuery.lte.mock.calls[0];
      expect(field).toBe("recorded_date");
      expect(typeof value).toBe("string");
    });

    it("applies all filters combined", async () => {
      const c = usePerformance();
      await c.fetchMetrics({
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

    it("captures Error.message on failure", async () => {
      mockQuery.__setTestError(new Error("DB down"));
      const c = usePerformance();
      await c.fetchMetrics();
      expect(c.error.value).toBe("DB down");
      expect(c.loading.value).toBe(false);
      expect(c.metrics.value).toEqual([]);
    });

    it("falls back to default message for non-Error throws", async () => {
      mockQuery.__setTestError({ weird: "thing" });
      const c = usePerformance();
      await c.fetchMetrics();
      expect(c.error.value).toBe("Failed to fetch metrics");
    });
  });

  // ==========================================================================
  // createMetric
  // ==========================================================================

  describe("createMetric", () => {
    const newMetric = {
      event_id: null,
      metric_type: "exit_velo" as const,
      value: 90,
      unit: "mph",
      recorded_date: "2024-02-01T00:00:00Z",
      verified: false,
    };

    it("throws when user not authenticated", async () => {
      mockUser = null;
      const c = usePerformance();
      await expect(c.createMetric(newMetric)).rejects.toThrow(
        "User not authenticated",
      );
    });

    it("inserts metric scoped to user, prepends to local state, returns row", async () => {
      const inserted = createMockMetric({ id: "fresh", value: 90 });
      mockQuery.__setTestData(inserted);
      const c = usePerformance();
      const result = await c.createMetric(newMetric);

      expect(mockSupabase.from).toHaveBeenCalledWith("performance_metrics");
      expect(mockQuery.insert).toHaveBeenCalledWith([
        { ...newMetric, user_id: "user-123" },
      ]);
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.single).toHaveBeenCalled();
      expect(result.id).toBe("fresh");
      expect(c.metrics.value[0].id).toBe("fresh");
      expect(c.loading.value).toBe(false);
    });

    it("propagates insertError with message and sets error", async () => {
      mockQuery.__setTestError(new Error("Insert failed"));
      const c = usePerformance();
      await expect(c.createMetric(newMetric)).rejects.toThrow("Insert failed");
      expect(c.error.value).toBe("Insert failed");
      expect(c.loading.value).toBe(false);
    });

    it("falls back to default message for non-Error throws", async () => {
      mockQuery.__setTestError("weird-string");
      const c = usePerformance();
      await expect(c.createMetric(newMetric)).rejects.toBeDefined();
      expect(c.error.value).toBe("Failed to create metric");
    });
  });

  // ==========================================================================
  // updateMetric
  // ==========================================================================

  describe("updateMetric", () => {
    it("throws when user not authenticated", async () => {
      mockUser = null;
      const c = usePerformance();
      await expect(c.updateMetric("m-1", { value: 50 })).rejects.toThrow(
        "User not authenticated",
      );
    });

    it("calls supabase update().eq('id', id).select().single() and returns row", async () => {
      const updated = createMockMetric({ id: "m-1", value: 99 });
      mockQuery.__setTestData(updated);
      const c = usePerformance();
      const result = await c.updateMetric("m-1", { value: 99 });
      expect(mockQuery.update).toHaveBeenCalledWith({ value: 99 });
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "m-1");
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.single).toHaveBeenCalled();
      expect(result.value).toBe(99);
    });

    it("replaces metric in local state when id matches", async () => {
      const original = createMockMetric({ id: "m-1", value: 80 });
      mockQuery.__setTestData([original]);
      const c = usePerformance();
      await c.fetchMetrics();
      expect(c.metrics.value).toHaveLength(1);

      const updated = createMockMetric({ id: "m-1", value: 95 });
      mockQuery.__setTestData(updated);
      await c.updateMetric("m-1", { value: 95 });
      expect(c.metrics.value[0].value).toBe(95);
    });

    it("does not mutate local state when id is not present", async () => {
      const other = createMockMetric({ id: "other", value: 80 });
      mockQuery.__setTestData([other]);
      const c = usePerformance();
      await c.fetchMetrics();

      const updated = createMockMetric({ id: "missing", value: 95 });
      mockQuery.__setTestData(updated);
      await c.updateMetric("missing", { value: 95 });
      expect(c.metrics.value[0].value).toBe(80);
    });

    it("propagates updateError with message", async () => {
      mockQuery.__setTestError(new Error("Update failed"));
      const c = usePerformance();
      await expect(c.updateMetric("m-1", { value: 1 })).rejects.toThrow(
        "Update failed",
      );
      expect(c.error.value).toBe("Update failed");
      expect(c.loading.value).toBe(false);
    });

    it("falls back to default message for non-Error throws", async () => {
      mockQuery.__setTestError({ code: "x" });
      const c = usePerformance();
      await expect(c.updateMetric("m-1", { value: 1 })).rejects.toBeDefined();
      expect(c.error.value).toBe("Failed to update metric");
    });
  });

  // ==========================================================================
  // deleteMetric
  // ==========================================================================

  describe("deleteMetric", () => {
    it("throws when user not authenticated", async () => {
      mockUser = null;
      const c = usePerformance();
      await expect(c.deleteMetric("m-1")).rejects.toThrow(
        "User not authenticated",
      );
    });

    it("removes metric from local state on success", async () => {
      const a = createMockMetric({ id: "a", value: 1 });
      const b = createMockMetric({ id: "b", value: 2 });
      mockQuery.__setTestData([a, b]);
      const c = usePerformance();
      await c.fetchMetrics();
      expect(c.metrics.value).toHaveLength(2);

      mockQuery.__setTestData(null);
      await c.deleteMetric("a");
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "a");
      expect(c.metrics.value.map((m) => m.id)).toEqual(["b"]);
      expect(c.loading.value).toBe(false);
    });

    it("propagates deleteError with message", async () => {
      mockQuery.__setTestError(new Error("Delete failed"));
      const c = usePerformance();
      await expect(c.deleteMetric("m-1")).rejects.toThrow("Delete failed");
      expect(c.error.value).toBe("Delete failed");
      expect(c.loading.value).toBe(false);
    });

    it("falls back to default message for non-Error throws", async () => {
      mockQuery.__setTestError(42);
      const c = usePerformance();
      await expect(c.deleteMetric("m-1")).rejects.toBeDefined();
      expect(c.error.value).toBe("Failed to delete metric");
    });
  });

  // ==========================================================================
  // Computed properties — populated state
  // ==========================================================================

  describe("metricsByType / latestMetrics", () => {
    it("groups metrics by metric_type", async () => {
      mockQuery.__setTestData([
        createMockMetric({ id: "a", metric_type: "exit_velo" }),
        createMockMetric({ id: "b", metric_type: "exit_velo" }),
        createMockMetric({ id: "c", metric_type: "velocity" }),
      ]);
      const c = usePerformance();
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
      const c = usePerformance();
      await c.fetchMetrics();
      expect(c.latestMetrics.value.exit_velo.id).toBe("new");
      expect(c.latestMetrics.value.velocity.id).toBe("v1");
    });
  });
});
