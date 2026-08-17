export interface ActivityRow {
  userId: string;
  ts: string;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function utcDayList(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function dailyActiveUsers(
  rows: ActivityRow[],
  from: Date,
  to: Date,
): { day: string; count: number }[] {
  const days = utcDayList(from, to);
  const byDay = new Map<string, Set<string>>(days.map((d) => [d, new Set<string>()]));
  for (const r of rows) {
    const d = dayKey(r.ts);
    byDay.get(d)?.add(r.userId);
  }
  return days.map((day) => ({ day, count: byDay.get(day)?.size ?? 0 }));
}

export function windowActiveCount(rows: ActivityRow[], since: Date, now: Date = new Date()): number {
  const users = new Set<string>();
  for (const r of rows) {
    const t = new Date(r.ts);
    if (t >= since && t <= now) users.add(r.userId);
  }
  return users.size;
}

export function funnelWithDropoff(
  stages: { stage: string; count: number }[],
): { stage: string; count: number; dropoffPct: number | null }[] {
  return stages.map((s, i) => {
    if (i === 0) return { ...s, dropoffPct: null };
    const prev = stages[i - 1].count;
    const dropoffPct = prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : null;
    return { ...s, dropoffPct };
  });
}

export function adoption(
  featureUserIds: Record<string, string[]>,
  totalUsers: number,
): { totalUsers: number; features: { feature: string; users: number; pct: number }[] } {
  const features = Object.entries(featureUserIds).map(([feature, ids]) => {
    const users = new Set(ids).size;
    const pct = totalUsers > 0 ? Math.round((users / totalUsers) * 100) : 0;
    return { feature, users, pct };
  });
  return { totalUsers, features };
}
