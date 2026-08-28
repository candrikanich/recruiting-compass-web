import { usePerformanceMetricsCrud } from "./usePerformanceMetricsCrud";

/**
 * Performance metrics CRUD adapter.
 * Persistence: infrastructure/performance. Grouping: domain/performance.
 */
export const usePerformance = () => usePerformanceMetricsCrud("usePerformance");
