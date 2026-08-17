function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dayBuckets(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cur <= end) {
    out.push(dayKey(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function countByDay(
  rows: Record<string, string>[],
  from: Date,
  to: Date,
  field: string = "created_at",
): { day: string; count: number }[] {
  const buckets = dayBuckets(from, to);
  const counts = new Map<string, number>(buckets.map((d) => [d, 0]));
  for (const r of rows) {
    const key = r[field].slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}
