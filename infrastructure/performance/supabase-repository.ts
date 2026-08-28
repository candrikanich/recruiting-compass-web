import type {
  CreateMetricInput,
  MetricListFilters,
  PerformanceMetricsRepository,
} from "~/application/performance";
import type { PerformanceMetric } from "~/types/models";

/**
 * Client surface the adapter needs. Real Supabase clients and the unit-test
 * chainable mock both satisfy this structurally.
 */
export interface PerformanceMetricsClient {
  from: (table: string) => unknown;
  rpc: (
    name: "set_primary_metric",
    params: { p_metric_id: string },
  ) => Promise<{ data: null; error: unknown }>;
}

export function createPerformanceMetricsRepository(
  client: PerformanceMetricsClient,
): PerformanceMetricsRepository {
  return {
    async list(userId, filters?: MetricListFilters) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (client.from("performance_metrics") as any)
        .select("*")
        .eq("user_id", userId);

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

      const { data, error } = await query.order("recorded_date", {
        ascending: false,
      });

      if (error) throw error;
      return (data || []) as PerformanceMetric[];
    },

    async create(
      row: CreateMetricInput & { user_id: string; family_unit_id: string },
    ) {
      const { data, error } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client.from("performance_metrics") as any)
          .insert([row])
          .select()
          .single()) as { data: PerformanceMetric; error: unknown };

      if (error) throw error;
      return data;
    },

    async update(id, updates) {
      const { data, error } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client.from("performance_metrics") as any)
          .update(updates)
          .eq("id", id)
          .select()
          .single()) as { data: PerformanceMetric; error: unknown };

      if (error) throw error;
      return data;
    },

    async remove(id) {
      const { error } = await (
        client.from("performance_metrics") as {
          delete: () => {
            eq: (
              column: string,
              value: string,
            ) => PromiseLike<{ error: unknown }>;
          };
        }
      )
        .delete()
        .eq("id", id);

      if (error) throw error;
    },

    async setPrimary(id) {
      const { error } = await client.rpc("set_primary_metric", {
        p_metric_id: id,
      });

      if (error) throw error;
    },
  };
}
