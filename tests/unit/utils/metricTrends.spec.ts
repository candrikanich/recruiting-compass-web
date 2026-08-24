import { describe, it, expect, vi } from "vitest";
import { computeMetricTrends } from "~/utils/metricTrends";
import type { PerformanceMetric } from "~/types/models";

// Isolate the trend algorithm from registry data: any type starting with "low_"
// is lower-is-better, everything else higher-is-better.
vi.mock("~/utils/metrics/canonical", () => ({
  getMetricDef: (type: string) => ({
    key: type,
    lowerIsBetter: type.startsWith("low_"),
  }),
}));

let idSeq = 0;
const metric = (
  type: string,
  value: number,
  recorded_date: string,
  unit = "mph",
): PerformanceMetric =>
  ({
    id: `m${idSeq++}`,
    metric_type: type,
    value,
    recorded_date,
    unit,
  }) as PerformanceMetric;

// Ascending dates so chronological order is unambiguous.
const day = (n: number) => `2026-01-${String(n).padStart(2, "0")}`;

describe("computeMetricTrends", () => {
  it("returns [] for no metrics", () => {
    expect(computeMetricTrends([])).toEqual([]);
  });

  it("omits a type with only one record", () => {
    expect(computeMetricTrends([metric("velo", 80, day(1))])).toEqual([]);
  });

  // Direction compares mean(earliest half) to mean(latest half), non-overlapping
  // (middle dropped at odd counts), so it resolves from n=2 upward.
  it("marks a rising higher-is-better metric as improving", () => {
    const trend = computeMetricTrends([
      metric("velo", 80, day(1)),
      metric("velo", 96, day(2)),
    ])[0];
    expect(trend.type).toBe("velo");
    expect(trend.trend).toBe("improving");
  });

  it("marks a falling higher-is-better metric as declining", () => {
    const trend = computeMetricTrends([
      metric("velo", 96, day(1)),
      metric("velo", 80, day(2)),
    ])[0];
    expect(trend.trend).toBe("declining");
  });

  it("inverts direction for a lower-is-better metric (falling time improves)", () => {
    const trend = computeMetricTrends([
      metric("low_sprint", 7.5, day(1)),
      metric("low_sprint", 6.8, day(2)),
    ])[0];
    expect(trend.trend).toBe("improving");
  });

  it("treats within-1% movement as stable", () => {
    const trend = computeMetricTrends([
      metric("velo", 100, day(1)),
      metric("velo", 100.5, day(2)),
    ])[0];
    expect(trend.trend).toBe("stable");
  });

  it("resolves direction at 3 records by dropping the middle", () => {
    // half = 1 → first=[80], last=[100]; the middle record is ignored.
    const improving = computeMetricTrends([
      metric("velo", 80, day(1)),
      metric("velo", 999, day(2)), // middle — dropped, must not sway direction
      metric("velo", 100, day(3)),
    ])[0];
    expect(improving.trend).toBe("improving");
  });

  it("caps values at the last 10 records, chronologically", () => {
    const metrics: PerformanceMetric[] = [];
    for (let i = 1; i <= 12; i++) metrics.push(metric("velo", i, day(i)));
    const trend = computeMetricTrends(metrics)[0];
    expect(trend.values).toHaveLength(10);
    expect(trend.values[0]).toBe(3); // records 3..12 kept (last 10)
    expect(trend.values.at(-1)).toBe(12);
    expect(trend.count).toBe(10);
  });

  it("sorts unordered input chronologically before deriving", () => {
    const trend = computeMetricTrends([
      metric("velo", 96, day(6)),
      metric("velo", 80, day(1)),
      metric("velo", 90, day(4)),
      metric("velo", 84, day(3)),
      metric("velo", 93, day(5)),
      metric("velo", 82, day(2)),
    ])[0];
    expect(trend.values).toEqual([80, 82, 84, 90, 93, 96]);
    expect(trend.trend).toBe("improving");
  });

  it("rounds min/max to 2 decimals and carries the first record's unit", () => {
    const trend = computeMetricTrends([
      metric("velo", 80.123, day(1), "mph"),
      metric("velo", 90.987, day(2), "mph"),
    ])[0];
    expect(trend.min).toBe(80.12);
    expect(trend.max).toBe(90.99);
    expect(trend.unit).toBe("mph");
  });

  it("derives independent trends for multiple types", () => {
    const trends = computeMetricTrends([
      metric("velo", 80, day(1)),
      metric("velo", 82, day(2)),
      metric("velo", 84, day(3)),
      metric("velo", 90, day(4)),
      metric("velo", 93, day(5)),
      metric("velo", 96, day(6)),
      metric("low_sprint", 7.5, day(1)),
      metric("low_sprint", 7.4, day(2)),
      metric("low_sprint", 7.3, day(3)),
      metric("low_sprint", 7.0, day(4)),
      metric("low_sprint", 6.9, day(5)),
      metric("low_sprint", 6.8, day(6)),
    ]);
    expect(trends).toHaveLength(2);
    expect(trends.every((t) => t.trend === "improving")).toBe(true);
  });
});
