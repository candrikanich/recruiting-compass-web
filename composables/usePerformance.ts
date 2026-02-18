import { ref, computed, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";
import type { PerformanceMetric } from "~/types/models";
import type { Database } from "~/types/database";

const logger = createClientLogger("usePerformance");

// Type aliases for Supabase casting
type _PerformanceMetricInsert =
  Database["public"]["Tables"]["performance_metrics"]["Insert"];
type _PerformanceMetricUpdate =
  Database["public"]["Tables"]["performance_metrics"]["Update"];

export const usePerformance = (): {
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
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const metrics = ref<PerformanceMetric[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

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

      // Move date filtering to SQL (10x less data transferred, faster)
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
      logger.error("Metric fetch error:", message);
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
      const { data, error: insertError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("performance_metrics") as any)
          .insert([
            {
              ...metricData,
              user_id: userStore.user.id,
            },
          ])
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: PerformanceMetric; error: any };

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
      const { data, error: updateError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("performance_metrics") as any)
          .update(updates)
          .eq("id", id)
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: PerformanceMetric; error: any };

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

  // Get metrics grouped by type for easy analysis
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

  // Get latest value for each metric type
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

  return {
    metrics: computed(() => metrics.value),
    metricsByType,
    latestMetrics,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchMetrics,
    createMetric,
    updateMetric,
    deleteMetric,
  };
};
