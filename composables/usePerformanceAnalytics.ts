import { performanceAnalytics } from "~/domain/performance";

/**
 * Presentation facade for performance analytics.
 * All calculation lives in domain/performance — this composable exists so
 * existing call sites keep the `usePerformanceAnalytics()` API.
 */
export const usePerformanceAnalytics = () => performanceAnalytics;
