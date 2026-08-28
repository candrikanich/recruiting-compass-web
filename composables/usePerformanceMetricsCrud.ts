import { computed, inject, ref, type ComputedRef } from "vue";
import type {
  CreateMetricInput,
  MetricListFilters,
} from "~/application/performance";
import {
  createPerformanceMetricsRepository,
  type PerformanceMetricsClient,
} from "~/infrastructure/performance";
import { groupMetricsByType, latestMetricsByType } from "~/domain/performance";
import { createClientLogger } from "~/utils/logger";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useFamilyContext } from "~/composables/useFamilyContext";
import type { useActiveFamily } from "~/composables/useActiveFamily";
import type { PerformanceMetric } from "~/types/models";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Vue adapter around the performance-metrics repository.
 * Owns loading/error/list state; persistence lives in infrastructure.
 */
export function usePerformanceMetricsCrud(logContext: string): {
  metrics: ComputedRef<PerformanceMetric[]>;
  metricsByType: ComputedRef<Record<string, PerformanceMetric[]>>;
  latestMetrics: ComputedRef<Record<string, PerformanceMetric>>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  fetchMetrics: (filters?: MetricListFilters) => Promise<void>;
  createMetric: (metricData: CreateMetricInput) => Promise<PerformanceMetric>;
  updateMetric: (
    id: string,
    updates: Partial<PerformanceMetric>,
  ) => Promise<PerformanceMetric>;
  deleteMetric: (id: string) => Promise<void>;
  setPrimaryMetric: (id: string) => Promise<void>;
  clearPrimaryMetric: (id: string) => Promise<void>;
} {
  const logger = createClientLogger(logContext);
  const supabase = useSupabase();
  const userStore = useUserStore();
  const injectedFamily =
    inject<ReturnType<typeof useActiveFamily>>("activeFamily");
  const activeFamily = injectedFamily ?? useFamilyContext();
  const repo = createPerformanceMetricsRepository(
    supabase as unknown as PerformanceMetricsClient,
  );

  const metrics = ref<PerformanceMetric[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchMetrics = async (filters?: MetricListFilters) => {
    if (!userStore.user) return;

    loading.value = true;
    error.value = null;

    try {
      metrics.value = await repo.list(userStore.user.id, filters);
    } catch (err: unknown) {
      const message = errorMessage(err, "Failed to fetch metrics");
      error.value = message;
      logger.error("Metric fetch error:", message);
    } finally {
      loading.value = false;
    }
  };

  const createMetric = async (metricData: CreateMetricInput) => {
    if (!userStore.user) throw new Error("User not authenticated");
    if (!activeFamily.activeFamilyId.value) {
      throw new Error("Family context not loaded");
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await repo.create({
        ...metricData,
        user_id: userStore.user.id,
        family_unit_id: activeFamily.activeFamilyId.value,
      });
      metrics.value.unshift(data);
      return data;
    } catch (err: unknown) {
      error.value = errorMessage(err, "Failed to create metric");
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
      const data = await repo.update(id, updates);
      const index = metrics.value.findIndex((m) => m.id === id);
      if (index !== -1) {
        metrics.value[index] = data;
      }
      return data;
    } catch (err: unknown) {
      error.value = errorMessage(err, "Failed to update metric");
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
      await repo.remove(id);
      metrics.value = metrics.value.filter((m) => m.id !== id);
    } catch (err: unknown) {
      error.value = errorMessage(err, "Failed to delete metric");
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const setPrimaryMetric = async (id: string) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      await repo.setPrimary(id);
      metrics.value = metrics.value.map((m) => ({
        ...m,
        is_primary: m.id === id,
      }));
    } catch (err: unknown) {
      error.value = errorMessage(err, "Failed to set primary metric");
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearPrimaryMetric = async (id: string) => {
    await updateMetric(id, { is_primary: false });
  };

  const metricsByType = computed(() => groupMetricsByType(metrics.value));
  const latestMetrics = computed(() => latestMetricsByType(metrics.value));

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
    setPrimaryMetric,
    clearPrimaryMetric,
  };
}
