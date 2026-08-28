import type { Performance } from "~/types/models";
import type {
  CategoryCount,
  FunnelStage,
  FunnelStageInput,
  PeriodComparison,
  PeriodType,
  RegressionLine,
  TrendDirection,
} from "./types";

/**
 * Pure performance analytics. No Vue, no I/O.
 * Behavior matches the former usePerformanceAnalytics / usePerformanceConsolidated copies.
 */

export function calculateAverage(
  performances: Performance[],
  metric: keyof Performance,
): number {
  if (performances.length === 0) return 0;
  const sum = performances.reduce((acc, p) => {
    const value = p[metric];
    return acc + (typeof value === "number" ? value : 0);
  }, 0);
  return Math.round((sum / performances.length) * 100) / 100;
}

export function calculateMax(
  performances: Performance[],
  metric: keyof Performance,
): number {
  if (performances.length === 0) return 0;
  const values = performances
    .map((p) => p[metric])
    .filter((v) => typeof v === "number") as number[];
  return values.length > 0 ? Math.max(...values) : 0;
}

export function calculateMin(
  performances: Performance[],
  metric: keyof Performance,
): number {
  if (performances.length === 0) return 0;
  const values = performances
    .map((p) => p[metric])
    .filter((v) => typeof v === "number") as number[];
  return values.length > 0 ? Math.min(...values) : 0;
}

export function calculateTrend(
  performances: Performance[],
  metric: keyof Performance,
): TrendDirection {
  if (performances.length < 2) return "stable";

  const mid = Math.floor(performances.length / 2);
  const firstHalf = performances.slice(0, mid);
  const secondHalf = performances.slice(mid);

  const firstAvg = calculateAverage(firstHalf, metric);
  const secondAvg = calculateAverage(secondHalf, metric);

  const diff = secondAvg - firstAvg;
  const threshold = firstAvg * 0.05; // 5% threshold

  if (diff > threshold) return "improving";
  if (diff < -threshold) return "declining";
  return "stable";
}

export function calculatePercentChange(
  oldValue: number,
  newValue: number,
): number {
  if (oldValue === 0) return 0;
  return Math.round(((newValue - oldValue) / oldValue) * 100 * 100) / 100;
}

export function filterByDateRange(
  performances: Performance[],
  startDate: Date,
  endDate: Date,
): Performance[] {
  return performances.filter((p) => {
    const date = new Date(p.created_at || "");
    return date >= startDate && date <= endDate;
  });
}

export function comparePeriods(
  performances: Performance[],
  metric: keyof Performance,
  periodDays: number,
): PeriodComparison {
  const now = new Date();
  const twoPeriodsAgo = new Date(
    now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000,
  );
  const onePeriodAgo = new Date(
    now.getTime() - periodDays * 24 * 60 * 60 * 1000,
  );

  const previousPeriodData = filterByDateRange(
    performances,
    twoPeriodsAgo,
    onePeriodAgo,
  );
  const currentPeriodData = filterByDateRange(performances, onePeriodAgo, now);

  const currentAvg = calculateAverage(currentPeriodData, metric);
  const previousAvg = calculateAverage(previousPeriodData, metric);
  const change = currentAvg - previousAvg;
  const changePercent = calculatePercentChange(previousAvg, currentAvg);

  return {
    currentPeriod: currentAvg,
    previousPeriod: previousAvg,
    change,
    changePercent,
  };
}

export function groupByPeriod(
  performances: Performance[],
  periodType: PeriodType,
): Record<string, Performance[]> {
  const grouped: Record<string, Performance[]> = {};

  performances.forEach((p) => {
    const date = new Date(p.created_at || "");
    let key: string;

    if (periodType === "daily") {
      // eslint-disable-next-line local/no-date-only-string-constructor -- pre-existing pattern outside Phase 7's assigned sweep (planning/audit-2026-07-27-findings.md cluster); flagged for a follow-up pass, not fixed here to keep this phase scoped.
      key = date.toISOString().split("T")[0];
    } else if (periodType === "weekly") {
      const week = Math.floor(
        (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );
      key = `Week ${week + 1}`;
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  return grouped;
}

export function projectPerformance(
  performances: Performance[],
  metric: keyof Performance,
  daysAhead: number = 30,
): number {
  if (performances.length < 2) return calculateAverage(performances, metric);

  const recentPerfs = performances.slice(-10);
  const values = recentPerfs
    .map((p) => p[metric])
    .filter((v) => typeof v === "number") as number[];

  if (values.length === 0) return 0;

  const n = values.length;
  const sumX = (n * (n + 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, v, i) => sum + v * (i + 1), 0);
  const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const weeksAhead = Math.ceil(daysAhead / 7);
  const projection = intercept + slope * (n + weeksAhead);

  return Math.max(0, Math.round(projection * 100) / 100);
}

export function calculateCorrelation(
  xValues: number[],
  yValues: number[],
): number {
  if (xValues.length !== yValues.length || xValues.length < 2) return 0;

  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
  const sumY2 = yValues.reduce((sum, y) => sum + y * y, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
  );

  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

export function calculateRegressionLine(
  xValues: number[],
  yValues: number[],
): RegressionLine {
  if (xValues.length !== yValues.length || xValues.length < 2) {
    return { slope: 0, intercept: 0, r2: 0, points: [] };
  }

  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  const ssRes = yValues.reduce(
    (sum, y, i) => sum + (y - (slope * xValues[i] + intercept)) ** 2,
    0,
  );
  const r2 =
    ssTotal === 0 ? 0 : Math.round((1 - ssRes / ssTotal) * 1000) / 1000;

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 10; i++) {
    const x = minX + (maxX - minX) * (i / 10);
    points.push({
      x: Math.round(x * 100) / 100,
      y: Math.round((slope * x + intercept) * 100) / 100,
    });
  }

  return {
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 100) / 100,
    r2,
    points,
  };
}

export function groupByCategory<T>(
  items: T[],
  categoryField: keyof T,
): CategoryCount[] {
  if (items.length === 0) return [];

  const grouped: Record<string, number> = {};
  items.forEach((item) => {
    const key = String(item[categoryField] || "Other");
    grouped[key] = (grouped[key] || 0) + 1;
  });

  const total = items.length;
  return Object.entries(grouped)
    .map(([label, value]) => ({
      label,
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

export function calculateFunnelMetrics(
  stages: FunnelStageInput[],
): FunnelStage[] {
  if (stages.length === 0) return [];

  const total = stages[0]?.count || 0;
  return stages.map((stage, index) => ({
    label: stage.label,
    count: stage.count,
    percentage: total > 0 ? Math.round((stage.count / total) * 100) : 0,
    conversionRate:
      index > 0 && stages[index - 1].count > 0
        ? Math.round((stage.count / stages[index - 1].count) * 100)
        : index === 0
          ? 100
          : 0,
  }));
}

/** Stable object for Vue composable facades that previously returned these as methods. */
export const performanceAnalytics = {
  calculateAverage,
  calculateMax,
  calculateMin,
  calculateTrend,
  calculatePercentChange,
  filterByDateRange,
  comparePeriods,
  groupByPeriod,
  projectPerformance,
  calculateCorrelation,
  calculateRegressionLine,
  groupByCategory,
  calculateFunnelMetrics,
} as const;
