import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePerformanceConsolidated } from "~/composables/usePerformanceConsolidated";
import { setActivePinia, createPinia } from "pinia";
import type { Performance, PerformanceMetric } from "~/types/models";

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

describe("usePerformanceConsolidated", () => {
  let mockQuery: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    };

    let testResponses: { data: any; error: null } = { data: [], error: null };

    Object.defineProperty(mockQuery, "then", {
      value: (
        onFulfilled: (value: any) => any,
        onRejected?: (reason: any) => any,
      ) => {
        return Promise.resolve(testResponses).then(onFulfilled, onRejected);
      },
    });

    mockQuery.__setTestData = (data: any) => {
      testResponses.data = data;
    };

    mockSupabase.from.mockReturnValue(mockQuery);
  });

  const createMockMetric = (overrides = {}): PerformanceMetric => ({
    id: "metric-123",
    user_id: "user-123",
    event_id: null,
    metric_type: "batting_average",
    value: 0.350,
    recorded_date: "2024-01-01T12:00:00Z",
    created_at: "2024-01-01T12:00:00Z",
    updated_at: "2024-01-01T12:00:00Z",
    ...overrides,
  });

  describe("CRUD Operations", () => {
    it("should initialize with empty metrics", () => {
      const { metrics, loading, error } = usePerformanceConsolidated();

      expect(metrics.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it("should fetch metrics for authenticated user", async () => {
      const mockMetrics = [
        createMockMetric({ id: "m1" }),
        createMockMetric({ id: "m2" }),
      ];
      mockQuery.__setTestData(mockMetrics);

      const { metrics, fetchMetrics } = usePerformanceConsolidated();

      await fetchMetrics();

      expect(metrics.value).toEqual(mockMetrics);
    });

    it("should handle no user gracefully", async () => {
      mockUser = null;
      const { metrics, fetchMetrics } = usePerformanceConsolidated();

      await fetchMetrics();

      expect(metrics.value).toEqual([]);

      mockUser = { id: "user-123", email: "test@example.com" };
    });

    it("should create new metric", async () => {
      const newMetric = createMockMetric();
      mockQuery.__setTestData(newMetric);

      const { createMetric, metrics } = usePerformanceConsolidated();

      const result = await createMetric({
        user_id: "user-123",
        event_id: null,
        metric_type: "batting_average",
        value: 0.350,
        recorded_date: "2024-01-01T12:00:00Z",
      });

      expect(result).toEqual(newMetric);
      expect(metrics.value[0]).toEqual(newMetric);
    });

    it("should update existing metric", async () => {
      const original = createMockMetric({ value: 0.300 });
      const updated = createMockMetric({ value: 0.350 });
      mockQuery.__setTestData(updated);

      const { updateMetric, metrics } = usePerformanceConsolidated();
      metrics.value = [original];

      const result = await updateMetric("metric-123", { value: 0.350 });

      expect(result.value).toBe(0.350);
    });

    it("should delete metric", async () => {
      const metric = createMockMetric();
      const { deleteMetric, metrics } = usePerformanceConsolidated();
      metrics.value = [metric];

      await deleteMetric("metric-123");

      expect(metrics.value).toEqual([]);
    });
  });

  describe("Computed Properties", () => {
    it("should have metricsByType computed property", () => {
      const { metricsByType } = usePerformanceConsolidated();

      expect(metricsByType.value).toBeDefined();
      expect(typeof metricsByType.value).toBe("object");
    });

    it("should have latestMetrics computed property", () => {
      const { latestMetrics } = usePerformanceConsolidated();

      expect(latestMetrics.value).toBeDefined();
      expect(typeof latestMetrics.value).toBe("object");
    });
  });

  describe("Analytics Functions", () => {
    const mockPerformances: Performance[] = [
      {
        id: "p1",
        user_id: "u1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        exit_velo: 85,
        launch_angle: 25,
      } as Performance,
      {
        id: "p2",
        user_id: "u1",
        created_at: "2024-01-02T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        exit_velo: 87,
        launch_angle: 28,
      } as Performance,
      {
        id: "p3",
        user_id: "u1",
        created_at: "2024-01-03T00:00:00Z",
        updated_at: "2024-01-03T00:00:00Z",
        exit_velo: 90,
        launch_angle: 30,
      } as Performance,
    ];

    it("should calculate average", () => {
      const { calculateAverage } = usePerformanceConsolidated();

      const avg = calculateAverage(mockPerformances, "exit_velo");

      expect(avg).toBe(87.33);
    });

    it("should calculate max", () => {
      const { calculateMax } = usePerformanceConsolidated();

      const max = calculateMax(mockPerformances, "exit_velo");

      expect(max).toBe(90);
    });

    it("should calculate min", () => {
      const { calculateMin } = usePerformanceConsolidated();

      const min = calculateMin(mockPerformances, "exit_velo");

      expect(min).toBe(85);
    });

    it("should detect improving trend", () => {
      const { calculateTrend } = usePerformanceConsolidated();

      // Create data with clear improvement (>5% difference)
      const improvingData: Performance[] = [
        {
          id: "p1",
          user_id: "u1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          exit_velo: 80,
        } as Performance,
        {
          id: "p2",
          user_id: "u1",
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          exit_velo: 81,
        } as Performance,
        {
          id: "p3",
          user_id: "u1",
          created_at: "2024-01-03T00:00:00Z",
          updated_at: "2024-01-03T00:00:00Z",
          exit_velo: 95,
        } as Performance,
        {
          id: "p4",
          user_id: "u1",
          created_at: "2024-01-04T00:00:00Z",
          updated_at: "2024-01-04T00:00:00Z",
          exit_velo: 96,
        } as Performance,
      ];

      const trend = calculateTrend(improvingData, "exit_velo");

      expect(trend).toBe("improving");
    });

    it("should calculate percent change", () => {
      const { calculatePercentChange } = usePerformanceConsolidated();

      const change = calculatePercentChange(100, 120);

      expect(change).toBe(20);
    });

    it("should calculate correlation", () => {
      const { calculateCorrelation } = usePerformanceConsolidated();

      const xValues = [1, 2, 3, 4, 5];
      const yValues = [2, 4, 6, 8, 10];

      const correlation = calculateCorrelation(xValues, yValues);

      expect(correlation).toBe(1); // Perfect positive correlation
    });

    it("should handle empty data gracefully", () => {
      const { calculateAverage, calculateMax, calculateMin } =
        usePerformanceConsolidated();

      const empty: Performance[] = [];

      expect(calculateAverage(empty, "exit_velo")).toBe(0);
      expect(calculateMax(empty, "exit_velo")).toBe(0);
      expect(calculateMin(empty, "exit_velo")).toBe(0);
    });

    it("should group by period (daily)", () => {
      const { groupByPeriod } = usePerformanceConsolidated();

      const grouped = groupByPeriod(mockPerformances, "daily");

      expect(Object.keys(grouped)).toContain("2024-01-01");
      expect(Object.keys(grouped)).toContain("2024-01-02");
      expect(Object.keys(grouped)).toContain("2024-01-03");
    });

    it("should calculate funnel metrics", () => {
      const { calculateFunnelMetrics } = usePerformanceConsolidated();

      const stages = [
        { label: "Visit", count: 100 },
        { label: "Click", count: 80 },
        { label: "Convert", count: 20 },
      ];

      const funnel = calculateFunnelMetrics(stages);

      expect(funnel[0].conversionRate).toBe(100);
      expect(funnel[1].conversionRate).toBe(80);
      expect(funnel[2].conversionRate).toBe(25);
    });

    it("should group by category", () => {
      const { groupByCategory } = usePerformanceConsolidated();

      const items = [
        { type: "A", count: 1 },
        { type: "A", count: 1 },
        { type: "B", count: 1 },
      ];

      const grouped = groupByCategory(items, "type");

      expect(grouped[0].label).toBe("A");
      expect(grouped[0].value).toBe(2);
      expect(grouped[1].label).toBe("B");
      expect(grouped[1].value).toBe(1);
    });
  });
});
