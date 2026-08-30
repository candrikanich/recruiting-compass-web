import type { PerformanceMetric } from "~/types/models";

export function groupMetricsByType(
  metrics: PerformanceMetric[],
): Record<string, PerformanceMetric[]> {
  const grouped: Record<string, PerformanceMetric[]> = {};
  metrics.forEach((m) => {
    if (!grouped[m.metric_type]) {
      grouped[m.metric_type] = [];
    }
    grouped[m.metric_type].push(m);
  });
  return grouped;
}

export function latestMetricsByType(
  metrics: PerformanceMetric[],
): Record<string, PerformanceMetric> {
  const latest: Record<string, PerformanceMetric> = {};
  const sorted = [...metrics].sort(
    (a, b) =>
      new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime(),
  );
  sorted.forEach((m) => {
    if (!latest[m.metric_type]) {
      latest[m.metric_type] = m;
    }
  });
  return latest;
}
