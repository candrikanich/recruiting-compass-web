export interface AdminGrowth {
  funnel: { stage: string; count: number; dropoffPct: number | null }[];
  activity: { dau: number; wau: number; mau: number; dailyTrend: { day: string; count: number }[] };
  adoption: { totalUsers: number; features: { feature: string; users: number; pct: number }[] };
  windowDays: number;
}
