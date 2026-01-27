import { ref, computed, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { PerformanceMetric, Performance } from "~/types/models";
import type { Database } from "~/types/database";

// Type aliases for Supabase casting
type PerformanceMetricInsert =
  Database["public"]["Tables"]["performance_metrics"]["Insert"];
type PerformanceMetricUpdate =
  Database["public"]["Tables"]["performance_metrics"]["Update"];

/**
 * usePerformanceConsolidated composable
 * Consolidated from usePerformance + usePerformanceAnalytics
 * Manages performance metrics CRUD operations and provides analytics
 *
 * Features:
 * - Fetch, create, update, delete performance metrics
 * - Calculate metrics (average, max, min, trend, correlation)
 * - Compare metrics across time periods
 * - Project future performance based on trends
 * - Group metrics by period and category
 * - Calculate funnel metrics
 */
export const usePerformanceConsolidated = (): {
  metrics: ComputedRef<PerformanceMetric[]>;
  metricsByType: ComputedRef<Record<string, PerformanceMetric[]>>;
  latestMetrics: ComputedRef<Record<string, PerformanceMetric>>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  fetchMetrics: (filters?: {
    metricType?: string;
    eventId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  createMetric: (
    metricData: Omit<PerformanceMetric, "id" | "created_at" | "updated_at">,
  ) => Promise<PerformanceMetric>;
  updateMetric: (
    id: string,
    updates: Partial<PerformanceMetric>,
  ) => Promise<PerformanceMetric>;
  deleteMetric: (id: string) => Promise<void>;
  calculateAverage: (
    performances: Performance[],
    metric: keyof Performance,
  ) => number;
  calculateMax: (
    performances: Performance[],
    metric: keyof Performance,
  ) => number;
  calculateMin: (
    performances: Performance[],
    metric: keyof Performance,
  ) => number;
  calculateTrend: (
    performances: Performance[],
    metric: keyof Performance,
  ) => "improving" | "declining" | "stable";
  calculatePercentChange: (oldValue: number, newValue: number) => number;
  filterByDateRange: (
    performances: Performance[],
    startDate: Date,
    endDate: Date,
  ) => Performance[];
  comparePeriods: (
    performances: Performance[],
    metric: keyof Performance,
    periodDays: number,
  ) => {
    currentPeriod: number;
    previousPeriod: number;
    change: number;
    changePercent: number;
  };
  groupByPeriod: (
    performances: Performance[],
    periodType: "daily" | "weekly" | "monthly",
  ) => Record<string, Performance[]>;
  projectPerformance: (
    performances: Performance[],
    metric: keyof Performance,
    daysAhead?: number,
  ) => number;
  calculateCorrelation: (xValues: number[], yValues: number[]) => number;
  calculateRegressionLine: (
    xValues: number[],
    yValues: number[],
  ) => {
    slope: number;
    intercept: number;
    r2: number;
    points: Array<{ x: number; y: number }>;
  };
  groupByCategory: <T>(
    items: T[],
    categoryField: keyof T,
  ) => Array<{ label: string; value: number; percentage: number }>;
  calculateFunnelMetrics: (
    stages: Array<{ label: string; count: number }>,
  ) => Array<{
    label: string;
    count: number;
    percentage: number;
    conversionRate: number;
  }>;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const metrics = ref<PerformanceMetric[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ============================================================================
  // CRUD OPERATIONS (from usePerformance)
  // ============================================================================

  const fetchMetrics = async (filters?: {
    metricType?: string;
    eventId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!userStore.user) return;

    loading.value = true;
    error.value = null;

    try {
      let query = supabase
        .from("performance_metrics")
        .select("*")
        .eq("user_id", userStore.user.id);

      if (filters?.metricType) {
        query = query.eq("metric_type", filters.metricType);
      }

      if (filters?.eventId) {
        query = query.eq("event_id", filters.eventId);
      }

      if (filters?.startDate) {
        query = query.gte(
          "recorded_date",
          new Date(filters.startDate).toISOString(),
        );
      }

      if (filters?.endDate) {
        query = query.lte(
          "recorded_date",
          new Date(filters.endDate).toISOString(),
        );
      }

      const { data, error: fetchError } = await query.order("recorded_date", {
        ascending: false,
      });

      if (fetchError) throw fetchError;

      metrics.value = data || [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch metrics";
      error.value = message;
      console.error("Metric fetch error:", message);
    } finally {
      loading.value = false;
    }
  };

  const createMetric = async (
    metricData: Omit<PerformanceMetric, "id" | "created_at" | "updated_at">,
  ) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { data, error: insertError } = await supabase
        .from("performance_metrics")
        .insert([
          {
            ...metricData,
            user_id: userStore.user.id,
          },
        ] as PerformanceMetricInsert[])
        .select()
        .single();

      if (insertError) throw insertError;

      metrics.value.unshift(data);
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create metric";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateMetric = async (
    id: string,
    updates: Partial<PerformanceMetric>,
  ) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { data, error: updateError } = await supabase
        .from("performance_metrics")
        .update(updates as PerformanceMetricUpdate)
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      const index = metrics.value.findIndex((m) => m.id === id);
      if (index !== -1) {
        metrics.value[index] = data;
      }

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update metric";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteMetric = async (id: string) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { error: deleteError } = await supabase
        .from("performance_metrics")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      metrics.value = metrics.value.filter((m) => m.id !== id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete metric";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // ============================================================================
  // COMPUTED PROPERTIES (from usePerformance)
  // ============================================================================

  const metricsByType = computed(() => {
    const grouped: Record<string, PerformanceMetric[]> = {};
    metrics.value.forEach((m) => {
      if (!grouped[m.metric_type]) {
        grouped[m.metric_type] = [];
      }
      grouped[m.metric_type].push(m);
    });
    return grouped;
  });

  const latestMetrics = computed(() => {
    const latest: Record<string, PerformanceMetric> = {};
    const sorted = [...metrics.value].sort(
      (a, b) =>
        new Date(b.recorded_date).getTime() -
        new Date(a.recorded_date).getTime(),
    );
    sorted.forEach((m) => {
      if (!latest[m.metric_type]) {
        latest[m.metric_type] = m;
      }
    });
    return latest;
  });

  // ============================================================================
  // ANALYTICS FUNCTIONS (from usePerformanceAnalytics)
  // ============================================================================

  const calculateAverage = (
    performances: Performance[],
    metric: keyof Performance,
  ): number => {
    if (performances.length === 0) return 0;
    const sum = performances.reduce((acc, p) => {
      const value = p[metric];
      return acc + (typeof value === "number" ? value : 0);
    }, 0);
    return Math.round((sum / performances.length) * 100) / 100;
  };

  const calculateMax = (
    performances: Performance[],
    metric: keyof Performance,
  ): number => {
    if (performances.length === 0) return 0;
    const values = performances
      .map((p) => p[metric])
      .filter((v) => typeof v === "number") as number[];
    return values.length > 0 ? Math.max(...values) : 0;
  };

  const calculateMin = (
    performances: Performance[],
    metric: keyof Performance,
  ): number => {
    if (performances.length === 0) return 0;
    const values = performances
      .map((p) => p[metric])
      .filter((v) => typeof v === "number") as number[];
    return values.length > 0 ? Math.min(...values) : 0;
  };

  const calculateTrend = (
    performances: Performance[],
    metric: keyof Performance,
  ): "improving" | "declining" | "stable" => {
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
  };

  const calculatePercentChange = (
    oldValue: number,
    newValue: number,
  ): number => {
    if (oldValue === 0) return 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100 * 100) / 100;
  };

  const filterByDateRange = (
    performances: Performance[],
    startDate: Date,
    endDate: Date,
  ): Performance[] => {
    return performances.filter((p) => {
      const date = new Date(p.created_at || "");
      return date >= startDate && date <= endDate;
    });
  };

  const comparePeriods = (
    performances: Performance[],
    metric: keyof Performance,
    periodDays: number,
  ): {
    currentPeriod: number;
    previousPeriod: number;
    change: number;
    changePercent: number;
  } => {
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
    const currentPeriodData = filterByDateRange(
      performances,
      onePeriodAgo,
      now,
    );

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
  };

  const groupByPeriod = (
    performances: Performance[],
    periodType: "daily" | "weekly" | "monthly",
  ): Record<string, Performance[]> => {
    const grouped: Record<string, Performance[]> = {};

    performances.forEach((p) => {
      const date = new Date(p.created_at || "");
      let key: string;

      if (periodType === "daily") {
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
  };

  const projectPerformance = (
    performances: Performance[],
    metric: keyof Performance,
    daysAhead: number = 30,
  ): number => {
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
  };

  const calculateCorrelation = (
    xValues: number[],
    yValues: number[],
  ): number => {
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
  };

  const calculateRegressionLine = (
    xValues: number[],
    yValues: number[],
  ): {
    slope: number;
    intercept: number;
    r2: number;
    points: Array<{ x: number; y: number }>;
  } => {
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
  };

  const groupByCategory = <T>(
    items: T[],
    categoryField: keyof T,
  ): Array<{ label: string; value: number; percentage: number }> => {
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
  };

  const calculateFunnelMetrics = (
    stages: Array<{ label: string; count: number }>,
  ): Array<{
    label: string;
    count: number;
    percentage: number;
    conversionRate: number;
  }> => {
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
  };

  return {
    // State
    metrics: computed(() => metrics.value),
    metricsByType,
    latestMetrics,
    loading: computed(() => loading.value),
    error: computed(() => error.value),

    // CRUD Methods
    fetchMetrics,
    createMetric,
    updateMetric,
    deleteMetric,

    // Analytics Methods
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
  };
};
