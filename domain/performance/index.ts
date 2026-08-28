export {
  calculateAverage,
  calculateCorrelation,
  calculateFunnelMetrics,
  calculateMax,
  calculateMin,
  calculatePercentChange,
  calculateRegressionLine,
  calculateTrend,
  comparePeriods,
  filterByDateRange,
  groupByCategory,
  groupByPeriod,
  performanceAnalytics,
  projectPerformance,
} from "./analytics";
export { groupMetricsByType, latestMetricsByType } from "./grouping";
export type {
  CategoryCount,
  FunnelStage,
  FunnelStageInput,
  PeriodComparison,
  PeriodType,
  RegressionLine,
  TrendDirection,
} from "./types";
