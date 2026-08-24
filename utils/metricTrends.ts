/**
 * Pure metric-trend derivation, extracted from pages/performance/index.vue so the
 * improving/declining/stable logic is unit-testable in isolation.
 *
 * A metric type qualifies once it has >= 2 records. Trend direction compares the
 * mean of the earliest half of records to the mean of the latest half — the two
 * halves never overlap (the middle record is dropped at odd counts), so a real
 * direction shows from the very first two records. A ±1% dead-band → "stable".
 * Whether higher or lower is better comes from the metric registry per sport
 * (`getMetricDef(type).lowerIsBetter`).
 */

import { getMetricDef } from "~/utils/metrics/canonical";
import type { PerformanceMetric } from "~/types/models";

export type MetricTrendDirection = "improving" | "declining" | "stable";

export interface MetricTrend {
  type: string;
  /** Chronological values, capped to the last 10 records. */
  values: number[];
  min: number;
  max: number;
  average: number;
  unit: string;
  count: number;
  trend: MetricTrendDirection;
}

const mean = (nums: number[]): number =>
  nums.reduce((a, b) => a + b, 0) / nums.length;

/**
 * Group metrics by type and derive a trend per type with >= 2 records. Types
 * with a single record are omitted (no trend to show).
 */
export function computeMetricTrends(
  metrics: readonly PerformanceMetric[],
): MetricTrend[] {
  const typeGroups: Record<string, PerformanceMetric[]> = {};
  for (const m of metrics) {
    (typeGroups[m.metric_type] ??= []).push(m);
  }

  return Object.entries(typeGroups)
    .filter(([, records]) => records.length >= 2)
    .map(([type, records]) => {
      const sorted = [...records].sort(
        (a, b) =>
          new Date(a.recorded_date).getTime() -
          new Date(b.recorded_date).getTime(),
      );
      const values = sorted.map((m) => m.value).slice(-10); // last 10 records
      const min = Math.min(...values);
      const max = Math.max(...values);
      const average = mean(values);

      // Non-overlapping early vs recent halves (middle dropped at odd counts) so
      // direction is meaningful from n=2, not just n>=6 as a first3/last3 compare.
      const half = Math.floor(values.length / 2);
      const firstAvg = mean(values.slice(0, half));
      const lastAvg = mean(values.slice(values.length - half));

      // Direction ("lower is better") comes from the metric registry, per sport.
      const lowerIsBetter = getMetricDef(type).lowerIsBetter;
      let trend: MetricTrendDirection;
      if (lowerIsBetter) {
        if (lastAvg < firstAvg * 0.99) trend = "improving";
        else if (lastAvg > firstAvg * 1.01) trend = "declining";
        else trend = "stable";
      } else {
        if (lastAvg > firstAvg * 1.01) trend = "improving";
        else if (lastAvg < firstAvg * 0.99) trend = "declining";
        else trend = "stable";
      }

      return {
        type,
        values,
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        average,
        unit: sorted[0].unit || "unit",
        count: values.length,
        trend,
      };
    });
}
