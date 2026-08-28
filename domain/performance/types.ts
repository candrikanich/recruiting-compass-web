export type TrendDirection = "improving" | "declining" | "stable";

export type PeriodType = "daily" | "weekly" | "monthly";

export interface PeriodComparison {
  currentPeriod: number;
  previousPeriod: number;
  change: number;
  changePercent: number;
}

export interface RegressionLine {
  slope: number;
  intercept: number;
  r2: number;
  points: Array<{ x: number; y: number }>;
}

export interface CategoryCount {
  label: string;
  value: number;
  percentage: number;
}

export interface FunnelStageInput {
  label: string;
  count: number;
}

export interface FunnelStage {
  label: string;
  count: number;
  percentage: number;
  conversionRate: number;
}
