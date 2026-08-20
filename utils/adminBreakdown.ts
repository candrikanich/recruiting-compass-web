/**
 * Pure shaping helpers for the Admin Overview breakdown charts.
 * No I/O — feed them rows already fetched by the stats endpoint.
 */

export interface BreakdownSlice {
  value: string;
  count: number;
}

/**
 * Group rows by a categorical field into descending-count slices.
 * Null / empty values collapse into a single `nullLabel` bucket, which is
 * always sorted last regardless of its size.
 */
export function groupCounts(
  rows: Record<string, unknown>[],
  field: string,
  nullLabel = "Unknown",
): BreakdownSlice[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[field];
    const key =
      raw === null || raw === undefined || raw === "" ? nullLabel : String(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      if (a.value === nullLabel) return 1;
      if (b.value === nullLabel) return -1;
      return b.count - a.count;
    });
}

export interface WeekBucket {
  weekStart: string; // ISO date (UTC Monday) of the bucket
  count: number;
}

/**
 * Bucket timestamped rows into the trailing `weeks` UTC-week buckets (Monday
 * start), oldest first. Rows outside the window are ignored. Always returns
 * exactly `weeks` buckets so the trend line has a stable x-axis even with gaps.
 */
export function weeklyCounts(
  rows: Record<string, unknown>[],
  field: string,
  weeks = 12,
  now: Date = new Date(),
): WeekBucket[] {
  const mondayOf = (d: Date): Date => {
    const utc = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
    const dow = (utc.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    utc.setUTCDate(utc.getUTCDate() - dow);
    return utc;
  };

  const currentMonday = mondayOf(now);
  const buckets: WeekBucket[] = [];
  const index = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(currentMonday);
    start.setUTCDate(start.getUTCDate() - i * 7);
    const key = start.toISOString().slice(0, 10);
    index.set(key, buckets.length);
    buckets.push({ weekStart: key, count: 0 });
  }

  for (const row of rows) {
    const raw = row[field];
    if (!raw) continue;
    const ts = new Date(String(raw));
    if (Number.isNaN(ts.getTime())) continue;
    const key = mondayOf(ts).toISOString().slice(0, 10);
    const at = index.get(key);
    if (at !== undefined) buckets[at].count += 1;
  }

  return buckets;
}
