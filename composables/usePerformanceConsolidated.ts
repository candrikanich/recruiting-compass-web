import { usePerformanceMetricsCrud } from "./usePerformanceMetricsCrud";
import { performanceAnalytics } from "~/domain/performance";

/**
 * Consolidated performance facade (CRUD + analytics).
 * Public API is unchanged; analytics is the shared domain module rather than
 * a second copy of the math that lived in this file.
 */
export const usePerformanceConsolidated = () => {
  const crud = usePerformanceMetricsCrud("usePerformanceConsolidated");
  return {
    metrics: crud.metrics,
    metricsByType: crud.metricsByType,
    latestMetrics: crud.latestMetrics,
    loading: crud.loading,
    error: crud.error,
    fetchMetrics: crud.fetchMetrics,
    createMetric: crud.createMetric,
    updateMetric: crud.updateMetric,
    deleteMetric: crud.deleteMetric,
    ...performanceAnalytics,
  };
};
