import { describe, it, expect } from "vitest";
import { usePerformanceAnalytics } from "~/composables/usePerformanceAnalytics";
import type { Performance } from "~/types/models";

interface MockItem extends Record<string, any> {
  category?: string;
  type?: string;
  name?: string;
}

describe("usePerformanceAnalytics", () => {
  const {
    calculateAverage,
    calculateMax,
    calculateMin,
    calculateTrend,
    calculatePercentChange,
    comparePeriods,
    groupByPeriod,
    projectPerformance,
    calculateCorrelation,
    calculateRegressionLine,
    groupByCategory,
    calculateFunnelMetrics,
  } = usePerformanceAnalytics();

  const createMockPerformance = (overrides = {}): Performance => ({
    id: "perf-1",
    user_id: "user-1",
    date: new Date().toISOString().split("T")[0],
    metric_type: "exit_velo",
    value: 90,
    notes: "Good swing",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  describe("calculateAverage", () => {
    it("should calculate average of numeric values", () => {
      const performances = [
        createMockPerformance({ value: 90 }),
        createMockPerformance({ id: "perf-2", value: 92 }),
        createMockPerformance({ id: "perf-3", value: 88 }),
      ];

      const avg = calculateAverage(performances, "value");
      expect(avg).toBe(90);
    });

    it("should return 0 for empty array", () => {
      const avg = calculateAverage([], "value");
      expect(avg).toBe(0);
    });
  });

  describe("calculateMax", () => {
    it("should find maximum value", () => {
      const performances = [
        createMockPerformance({ value: 90 }),
        createMockPerformance({ id: "perf-2", value: 95 }),
        createMockPerformance({ id: "perf-3", value: 88 }),
      ];

      const max = calculateMax(performances, "value");
      expect(max).toBe(95);
    });

    it("should return 0 for empty array", () => {
      const max = calculateMax([], "value");
      expect(max).toBe(0);
    });
  });

  describe("calculateMin", () => {
    it("should find minimum value", () => {
      const performances = [
        createMockPerformance({ value: 90 }),
        createMockPerformance({ id: "perf-2", value: 95 }),
        createMockPerformance({ id: "perf-3", value: 85 }),
      ];

      const min = calculateMin(performances, "value");
      expect(min).toBe(85);
    });
  });

  describe("calculateTrend", () => {
    it("should identify improving trend", () => {
      const performances = [
        createMockPerformance({ value: 85 }),
        createMockPerformance({ id: "perf-2", value: 86 }),
        createMockPerformance({ id: "perf-3", value: 95 }),
        createMockPerformance({ id: "perf-4", value: 96 }),
      ];

      const trend = calculateTrend(performances, "value");
      expect(trend).toBe("improving");
    });

    it("should identify declining trend", () => {
      const performances = [
        createMockPerformance({ value: 95 }),
        createMockPerformance({ id: "perf-2", value: 96 }),
        createMockPerformance({ id: "perf-3", value: 85 }),
        createMockPerformance({ id: "perf-4", value: 84 }),
      ];

      const trend = calculateTrend(performances, "value");
      expect(trend).toBe("declining");
    });

    it("should identify stable trend", () => {
      const performances = [
        createMockPerformance({ value: 90 }),
        createMockPerformance({ id: "perf-2", value: 90 }),
        createMockPerformance({ id: "perf-3", value: 91 }),
        createMockPerformance({ id: "perf-4", value: 90 }),
      ];

      const trend = calculateTrend(performances, "value");
      expect(trend).toBe("stable");
    });
  });

  describe("calculatePercentChange", () => {
    it("should calculate positive percentage change", () => {
      const change = calculatePercentChange(100, 110);
      expect(change).toBe(10);
    });

    it("should calculate negative percentage change", () => {
      const change = calculatePercentChange(100, 90);
      expect(change).toBe(-10);
    });

    it("should return 0 when old value is 0", () => {
      const change = calculatePercentChange(0, 100);
      expect(change).toBe(0);
    });
  });

  describe("comparePeriods", () => {
    it("should compare two time periods", () => {
      const now = new Date();
      const performancesThirtyToSixtyDaysAgo = [
        createMockPerformance({
          value: 85,
          created_at: new Date(
            now.getTime() - 45 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ];
      const performancesRecent = [
        createMockPerformance({
          value: 95,
          created_at: new Date(
            now.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ];
      const allPerformances = [
        ...performancesThirtyToSixtyDaysAgo,
        ...performancesRecent,
      ];

      const comparison = comparePeriods(allPerformances, "value", 30);
      expect(comparison.currentPeriod).toBeGreaterThan(0);
      expect(comparison.previousPeriod).toBeGreaterThan(0);
    });
  });

  describe("groupByPeriod", () => {
    it("should group performances by day", () => {
      const today = new Date().toISOString();
      const yesterday = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();

      const performances = [
        createMockPerformance({ created_at: today }),
        createMockPerformance({ id: "perf-2", created_at: yesterday }),
        createMockPerformance({ id: "perf-3", created_at: today }),
      ];

      const grouped = groupByPeriod(performances, "daily");
      const groupKeys = Object.keys(grouped);
      expect(groupKeys.length).toBe(2);
    });

    it("should group performances by week", () => {
      const performances = [
        createMockPerformance(),
        createMockPerformance({ id: "perf-2" }),
      ];

      const grouped = groupByPeriod(performances, "weekly");
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
      expect(Object.values(grouped)[0].length).toBeGreaterThan(0);
    });

    it("should group performances by month", () => {
      const performances = [
        createMockPerformance(),
        createMockPerformance({ id: "perf-2" }),
      ];

      const grouped = groupByPeriod(performances, "monthly");
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    });
  });

  describe("projectPerformance", () => {
    it("should project future performance", () => {
      const performances = [
        createMockPerformance({ value: 85 }),
        createMockPerformance({ id: "perf-2", value: 86 }),
        createMockPerformance({ id: "perf-3", value: 87 }),
        createMockPerformance({ id: "perf-4", value: 88 }),
        createMockPerformance({ id: "perf-5", value: 89 }),
      ];

      const projection = projectPerformance(performances, "value", 30);
      expect(projection).toBeGreaterThan(0);
    });

    it("should return average for single performance", () => {
      const performances = [createMockPerformance({ value: 90 })];

      const projection = projectPerformance(performances, "value", 30);
      expect(projection).toBe(90);
    });

    it("should return positive projection for improving trend", () => {
      const performances = Array.from({ length: 10 }, (_, i) =>
        createMockPerformance({
          id: `perf-${i}`,
          value: 80 + i,
        }),
      );

      const projection = projectPerformance(performances, "value", 30);
      expect(projection).toBeGreaterThan(
        calculateAverage(performances, "value"),
      );
    });
  });

  describe("calculateCorrelation", () => {
    it("should calculate perfect positive correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const correlation = calculateCorrelation(x, y);
      expect(correlation).toBe(1);
    });

    it("should calculate perfect negative correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];
      const correlation = calculateCorrelation(x, y);
      expect(correlation).toBe(-1);
    });

    it("should return 0 for no correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 3, 1, 4, 2];
      const correlation = calculateCorrelation(x, y);
      expect(correlation).toBeLessThan(1);
      expect(correlation).toBeGreaterThan(-1);
    });

    it("should return 0 for mismatched array lengths", () => {
      const x = [1, 2, 3];
      const y = [1, 2, 3, 4];
      const correlation = calculateCorrelation(x, y);
      expect(correlation).toBe(0);
    });

    it("should return 0 for arrays with less than 2 values", () => {
      const x = [1];
      const y = [1];
      const correlation = calculateCorrelation(x, y);
      expect(correlation).toBe(0);
    });
  });

  describe("calculateRegressionLine", () => {
    it("should calculate correct slope and intercept", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = calculateRegressionLine(x, y);
      expect(result.slope).toBe(2);
      expect(result.intercept).toBe(0);
    });

    it("should calculate R-squared value", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = calculateRegressionLine(x, y);
      expect(result.r2).toBe(1);
    });

    it("should generate 11 points along the line", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = calculateRegressionLine(x, y);
      expect(result.points.length).toBe(11);
    });

    it("should handle insufficient data", () => {
      const x = [1];
      const y = [1];
      const result = calculateRegressionLine(x, y);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
      expect(result.points.length).toBe(0);
    });

    it("should handle identical values", () => {
      const x = [5, 5, 5];
      const y = [5, 5, 5];
      const result = calculateRegressionLine(x, y);
      expect(result.slope).toBe(NaN);
    });
  });

  describe("groupByCategory", () => {
    it("should group items by category field", () => {
      const items: MockItem[] = [
        { id: "1", category: "A" },
        { id: "2", category: "A" },
        { id: "3", category: "B" },
      ];
      const result = groupByCategory(items, "category");
      expect(result.length).toBe(2);
      expect(result[0].label).toBe("A");
      expect(result[0].value).toBe(2);
    });

    it("should calculate percentages correctly", () => {
      const items: MockItem[] = [
        { id: "1", category: "A" },
        { id: "2", category: "B" },
        { id: "3", category: "B" },
      ];
      const result = groupByCategory(items, "category");
      expect(result[0].percentage).toBe(67);
    });

    it("should sort by value descending", () => {
      const items: MockItem[] = [
        { id: "1", category: "A" },
        { id: "2", category: "B" },
        { id: "3", category: "B" },
        { id: "4", category: "B" },
      ];
      const result = groupByCategory(items, "category");
      expect(result[0].value).toBeGreaterThan(result[1].value);
    });

    it("should handle empty arrays", () => {
      const items: MockItem[] = [];
      const result = groupByCategory(items, "category");
      expect(result.length).toBe(0);
    });

    it("should handle missing category values", () => {
      const items: MockItem[] = [
        { id: "1", category: "A" },
        { id: "2" },
        { id: "3", category: "A" },
      ];
      const result = groupByCategory(items, "category");
      expect(result.length).toBe(2);
    });
  });

  describe("calculateFunnelMetrics", () => {
    it("should calculate conversion rates between stages", () => {
      const stages = [
        { label: "Awareness", count: 100 },
        { label: "Interest", count: 50 },
        { label: "Conversion", count: 25 },
      ];
      const result = calculateFunnelMetrics(stages);
      expect(result[1].conversionRate).toBe(50);
      expect(result[2].conversionRate).toBe(50);
    });

    it("should calculate percentage of total", () => {
      const stages = [
        { label: "Stage1", count: 100 },
        { label: "Stage2", count: 50 },
      ];
      const result = calculateFunnelMetrics(stages);
      expect(result[0].percentage).toBe(100);
      expect(result[1].percentage).toBe(50);
    });

    it("should set first stage conversion to 100%", () => {
      const stages = [{ label: "First", count: 100 }];
      const result = calculateFunnelMetrics(stages);
      expect(result[0].conversionRate).toBe(100);
    });

    it("should handle empty stages", () => {
      const stages: Array<{ label: string; count: number }> = [];
      const result = calculateFunnelMetrics(stages);
      expect(result.length).toBe(0);
    });

    it("should handle zero counts", () => {
      const stages = [
        { label: "Stage1", count: 0 },
        { label: "Stage2", count: 0 },
      ];
      const result = calculateFunnelMetrics(stages);
      expect(result[0].percentage).toBe(0);
      expect(result[1].conversionRate).toBe(0);
    });
  });
});
