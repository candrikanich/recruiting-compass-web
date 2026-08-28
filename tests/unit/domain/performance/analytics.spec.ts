import { describe, expect, it } from "vitest";
import {
  calculateAverage,
  calculateCorrelation,
  calculateFunnelMetrics,
  calculateMax,
  calculateMin,
  calculatePercentChange,
  calculateRegressionLine,
  calculateTrend,
  filterByDateRange,
  groupByCategory,
  groupByPeriod,
  projectPerformance,
} from "~/domain/performance";
import type { Performance } from "~/types/models";

function perf(createdAt: string, value: number): Performance {
  return {
    id: createdAt,
    user_id: "u1",
    recorded_date: createdAt,
    metric_type: "exit_velo",
    value,
    unit: "mph",
    verified: false,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

describe("domain/performance analytics", () => {
  const trio = [
    perf("2024-01-01T00:00:00Z", 85),
    perf("2024-01-02T00:00:00Z", 87),
    perf("2024-01-03T00:00:00Z", 90),
  ];

  it("averages, maxes, and mins numeric fields", () => {
    expect(calculateAverage(trio, "value")).toBe(87.33);
    expect(calculateMax(trio, "value")).toBe(90);
    expect(calculateMin(trio, "value")).toBe(85);
  });

  it("returns zeros for empty series", () => {
    expect(calculateAverage([], "value")).toBe(0);
    expect(calculateMax([], "value")).toBe(0);
    expect(calculateMin([], "value")).toBe(0);
  });

  it("classifies trend from first-half vs second-half averages", () => {
    expect(calculateTrend([], "value")).toBe("stable");
    expect(
      calculateTrend(
        [
          perf("2024-01-01T00:00:00Z", 80),
          perf("2024-01-02T00:00:00Z", 81),
          perf("2024-01-03T00:00:00Z", 95),
          perf("2024-01-04T00:00:00Z", 96),
        ],
        "value",
      ),
    ).toBe("improving");
    expect(
      calculateTrend(
        [
          perf("2024-01-01T00:00:00Z", 95),
          perf("2024-01-02T00:00:00Z", 96),
          perf("2024-01-03T00:00:00Z", 80),
          perf("2024-01-04T00:00:00Z", 81),
        ],
        "value",
      ),
    ).toBe("declining");
  });

  it("percent-change treats a zero baseline as 0", () => {
    expect(calculatePercentChange(100, 120)).toBe(20);
    expect(calculatePercentChange(0, 100)).toBe(0);
  });

  it("filters by created_at inclusive bounds", () => {
    const result = filterByDateRange(
      trio,
      new Date("2024-01-02T00:00:00Z"),
      new Date("2024-01-03T00:00:00Z"),
    );
    expect(result.map((p) => p.value)).toEqual([87, 90]);
  });

  it("groups by ISO day", () => {
    const grouped = groupByPeriod(trio, "daily");
    expect(Object.keys(grouped)).toEqual([
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
    ]);
  });

  it("projects a non-negative value from a short series", () => {
    expect(
      projectPerformance([perf("2024-01-01T00:00:00Z", 90)], "value"),
    ).toBe(90);
    expect(projectPerformance(trio, "value", 30)).toBeGreaterThan(0);
  });

  it("computes Pearson correlation and a regression line", () => {
    expect(calculateCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBe(1);
    expect(calculateCorrelation([1, 2], [1])).toBe(0);
    const line = calculateRegressionLine([1, 2, 3], [2, 4, 6]);
    expect(line.slope).toBe(2);
    expect(line.points).toHaveLength(11);
  });

  it("groups categories and funnel stages", () => {
    const grouped = groupByCategory(
      [{ type: "A" }, { type: "A" }, { type: "B" }],
      "type",
    );
    expect(grouped[0]).toEqual({ label: "A", value: 2, percentage: 67 });
    const funnel = calculateFunnelMetrics([
      { label: "Visit", count: 100 },
      { label: "Click", count: 80 },
      { label: "Convert", count: 20 },
    ]);
    expect(funnel[0].conversionRate).toBe(100);
    expect(funnel[1].conversionRate).toBe(80);
    expect(funnel[2].conversionRate).toBe(25);
  });
});
