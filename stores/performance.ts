import { defineStore } from "pinia";
import type { PerformanceMetric } from "~/types/models";

export interface PerformanceFilters {
  metricType?: string;
  eventId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PerformanceState {
  metrics: PerformanceMetric[];
  loading: boolean;
  error: string | null;
  isFetched: boolean;
  filters: PerformanceFilters;
}

/**
 * Performance store - Manages performance metrics data
 *
 * Provides centralized state management for:
 * - Performance metric CRUD operations
 * - Filtering by type, event, and date range
 * - Metric grouping and analysis
 * - Latest metric tracking
 *
 * @example
 * const perfStore = usePerformanceStore()
 * await perfStore.fetchMetrics()
 * const latest = perfStore.latestMetrics
 */
export const usePerformanceStore = defineStore("performance", {
  state: (): PerformanceState => ({
    metrics: [],
    loading: false,
    error: null,
    isFetched: false,
    filters: {
      metricType: undefined,
      eventId: undefined,
      startDate: undefined,
      endDate: undefined,
    },
  }),

  getters: {
    /**
     * Get metrics by type (grouped)
     */
    metricsByType: (state) => {
      const grouped: Record<string, PerformanceMetric[]> = {};
      state.metrics.forEach((m) => {
        if (!grouped[m.metric_type]) {
          grouped[m.metric_type] = [];
        }
        grouped[m.metric_type].push(m);
      });
      return grouped;
    },

     
    /**
     * Get latest value for each metric type
     */
     
    latestMetrics: (state) => {
      const latest: Record<string, PerformanceMetric> = {};
      const sorted = [...state.metrics].sort(
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
    },
     

    /**
     * Get metrics for a specific event
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     */
    metricsByEvent: (state) => (eventId: string) =>
      state.metrics.filter((m) => m.event_id === eventId),

    /**
     * Get metrics of a specific type
     */
    metricsByTypeFilter: (state) => (type: PerformanceMetric["metric_type"]) =>
      state.metrics.filter((m) => m.metric_type === type),

    /**
     * Get filtered metrics based on current filter state
     */
    filteredMetrics: (state) =>
      state.metrics.filter((m) => {
        if (
          state.filters.metricType &&
          m.metric_type !== state.filters.metricType
        )
          return false;
        if (state.filters.eventId && m.event_id !== state.filters.eventId)
          return false;
        if (state.filters.startDate) {
          const filterDate = new Date(state.filters.startDate);
          const metricDate = new Date(m.recorded_date);
          if (metricDate < filterDate) return false;
        }
        if (state.filters.endDate) {
          const filterDate = new Date(state.filters.endDate);
          const metricDate = new Date(m.recorded_date);
          if (metricDate > filterDate) return false;
        }
        return true;
      }),
  },

  actions: {
    /**
     * Fetch performance metrics with optional filters
     */
    async fetchMetrics(filters?: PerformanceFilters) {
      // Guard: don't refetch if already loaded
      if (this.isFetched && this.metrics.length > 0 && !filters) return;

      const { useSupabase } = await import("~/composables/useSupabase");
      const { useUserStore } = await import("./user");
      const userStore = useUserStore();
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

      try {
        if (!userStore.user) {
          throw new Error("User not authenticated");
        }

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

        // Move date filtering to SQL
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

        this.metrics = data || [];
        this.isFetched = true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch metrics";
        this.error = message;
        console.error(message);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Create a new performance metric
     */
    async createMetric(
      metricData: Omit<PerformanceMetric, "id" | "created_at" | "updated_at">,
    ) {
      const { useSupabase } = await import("~/composables/useSupabase");
      const { useUserStore } = await import("./user");
      const userStore = useUserStore();
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

      try {
        if (!userStore.user) {
          throw new Error("User not authenticated");
        }

        const insertData = [
          {
            ...metricData,
            user_id: userStore.user.id,
          },
        ];

        const response = (await supabase
          .from("performance_metrics")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(insertData as any)
          .select()
          .single()) as {
          data: PerformanceMetric;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: any;
        };

        const { data, error: insertError } = response;

        if (insertError) throw insertError;

        this.metrics.unshift(data);
        return data;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create metric";
        this.error = message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update an existing performance metric
     */
    async updateMetric(id: string, updates: Partial<PerformanceMetric>) {
      const { useSupabase } = await import("~/composables/useSupabase");
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = (await (supabase.from("performance_metrics") as any)
          .update(updates)
          .eq("id", id)
          .select()
          .single()) as {
          data: PerformanceMetric;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: any;
        };

        const { data, error: updateError } = response;

        if (updateError) throw updateError;

        // Update local state
        const index = this.metrics.findIndex((m) => m.id === id);
        if (index !== -1) {
          this.metrics[index] = data;
        }

        return data;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to update metric";
        this.error = message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Delete a performance metric
     */
    async deleteMetric(id: string) {
      const { useSupabase } = await import("~/composables/useSupabase");
      const supabase = useSupabase();

      this.loading = true;
      this.error = null;

      try {
        const { error: deleteError } = await supabase
          .from("performance_metrics")
          .delete()
          .eq("id", id);

        if (deleteError) throw deleteError;

        // Update local state
        this.metrics = this.metrics.filter((m) => m.id !== id);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete metric";
        this.error = message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Set filter state
     */
    setFilters(newFilters: Partial<PerformanceFilters>) {
      this.filters = { ...this.filters, ...newFilters };
    },

    /**
     * Reset all filters
     */
    resetFilters() {
      this.filters = {
        metricType: undefined,
        eventId: undefined,
        startDate: undefined,
        endDate: undefined,
      };
    },

    /**
     * Clear error state
     */
    clearError() {
      this.error = null;
    },
  },
});
