import type { PerformanceMetric } from "~/types/models";

export interface MetricListFilters {
  metricType?: string;
  eventId?: string;
  startDate?: string;
  endDate?: string;
}

export type CreateMetricInput = Omit<
  PerformanceMetric,
  "id" | "created_at" | "updated_at"
>;

/**
 * Persistence port for athlete performance metrics.
 * Infrastructure implements this; composables depend on the port, not Supabase.
 */
export interface PerformanceMetricsRepository {
  list(
    userId: string,
    filters?: MetricListFilters,
  ): Promise<PerformanceMetric[]>;
  create(
    row: CreateMetricInput & { user_id: string; family_unit_id: string },
  ): Promise<PerformanceMetric>;
  update(
    id: string,
    updates: Partial<PerformanceMetric>,
  ): Promise<PerformanceMetric>;
  remove(id: string): Promise<void>;
  setPrimary(id: string): Promise<void>;
}
