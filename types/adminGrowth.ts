export interface AdminGrowth {
  funnel: { stage: string; count: number; dropoffPct: number | null }[];
  activity: {
    dau: number;
    wau: number;
    mau: number;
    dailyTrend: { day: string; count: number }[];
  };
  adoption: {
    totalUsers: number;
    features: { feature: string; users: number; pct: number }[];
  };
  inboundEmail: {
    confirmationRate: number | null;
    coachMatchRate: number | null;
    // Distinct families with >=1 draft, over total families — a families
    // rate, not a users rate, so it's reported here rather than folded into
    // `adoption` (whose denominator is always users).
    familyAdoptionPct: number | null;
  };
  windowDays: number;
}
