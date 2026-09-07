export interface ActivityRow {
  userId: string;
  ts: string;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function utcDayList(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  const end = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
  );
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
  const byDay = new Map<string, Set<string>>(
    days.map((d) => [d, new Set<string>()]),
  );
  for (const r of rows) {
    const d = dayKey(r.ts);
    byDay.get(d)?.add(r.userId);
  }
  return days.map((day) => ({ day, count: byDay.get(day)?.size ?? 0 }));
}

export function windowActiveCount(
  rows: ActivityRow[],
  since: Date,
  now: Date = new Date(),
): number {
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
    const dropoffPct =
      prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : null;
    return { ...s, dropoffPct };
  });
}

/**
 * confirmed / (confirmed + discarded) over a window, excluding pending
 * drafts from the denominator — an undecided draft hasn't failed or
 * succeeded yet, so counting it as "not confirmed" would unfairly penalize
 * a family who forwarded something recently and hasn't reviewed it.
 * `null` (not NaN) when nothing has been decided yet.
 */
export function confirmationRate(
  drafts: { status: string }[],
): number | null {
  const decided = drafts.filter(
    (d) => d.status === "confirmed" || d.status === "discarded",
  );
  if (decided.length === 0) return null;
  const confirmed = decided.filter((d) => d.status === "confirmed").length;
  return Math.round((confirmed / decided.length) * 100);
}

/**
 * Share of drafts that resolved to a tracked coach — a proxy for parsing
 * quality, not a direct measure of it (a draft can be parsed correctly and
 * still match no coach we track). `null` (not NaN) when the window has no
 * drafts at all.
 */
export function coachMatchRate(
  drafts: { matchedCoachId: string | null }[],
): number | null {
  if (drafts.length === 0) return null;
  const matched = drafts.filter((d) => d.matchedCoachId !== null).length;
  return Math.round((matched / drafts.length) * 100);
}

/**
 * Feature-adoption share for a FAMILY-scoped feature (e.g. inbound email
 * drafts, which have no user_id) — distinct families with >=1 row, divided
 * by total families. Kept separate from `adoption()` below because that
 * helper's denominator is always a USER count; mixing a family-count feature
 * into it would understate its adoption by roughly half. `null` (not NaN)
 * when there are no families yet.
 */
export function familyAdoptionRate(
  draftFamilyIds: (string | null)[],
  totalFamilies: number,
): number | null {
  if (totalFamilies <= 0) return null;
  const families = new Set(draftFamilyIds.filter((id): id is string => Boolean(id)));
  return Math.round((families.size / totalFamilies) * 100);
}

export function adoption(
  featureUserIds: Record<string, string[]>,
  totalUsers: number,
): {
  totalUsers: number;
  features: { feature: string; users: number; pct: number }[];
} {
  const features = Object.entries(featureUserIds).map(([feature, ids]) => {
    const users = new Set(ids).size;
    const pct = totalUsers > 0 ? Math.round((users / totalUsers) * 100) : 0;
    return { feature, users, pct };
  });
  return { totalUsers, features };
}
