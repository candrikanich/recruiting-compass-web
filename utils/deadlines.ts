import type { UnifiedDeadline } from "~/types/deadline";

export function mergeDeadlines(
  userDeadlines: UnifiedDeadline[],
  systemDeadlines: UnifiedDeadline[],
): UnifiedDeadline[] {
  const seen = new Set<string>();
  const all = [...systemDeadlines, ...userDeadlines];
  const deduped = all.filter((d) => {
    const key = `${d.date}|${d.label}|${d.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.sort((a, b) => a.date.localeCompare(b.date));
}

export function groupByMonth(
  deadlines: UnifiedDeadline[],
): Map<string, UnifiedDeadline[]> {
  const map = new Map<string, UnifiedDeadline[]>();
  for (const d of deadlines) {
    const key = d.date.slice(0, 7); // "YYYY-MM"
    const arr = map.get(key) ?? [];
    arr.push(d);
    map.set(key, arr);
  }
  return map;
}

export function splitUpcomingPast(
  deadlines: UnifiedDeadline[],
  today: string,
): { upcoming: UnifiedDeadline[]; past: UnifiedDeadline[] } {
  const upcoming: UnifiedDeadline[] = [];
  const past: UnifiedDeadline[] = [];
  for (const d of deadlines) {
    if (d.date >= today) {
      upcoming.push(d);
    } else {
      past.push(d);
    }
  }
  return { upcoming, past };
}
