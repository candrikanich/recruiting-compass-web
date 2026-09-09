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

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 42 local YYYY-MM-DD date keys (6 weeks, Sunday-start) covering `month`
 * (0-indexed) of `year`, spilling into the adjacent months. Uses local
 * Date getters throughout — never toISOString/UTC — to avoid the
 * timezone off-by-one that bit the events-page calendar.
 */
export function buildCalendarGrid(year: number, month: number): string[] {
  const firstDay = new Date(year, month, 1);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(toDateKey(new Date(year, month, 1 - firstDay.getDay() + i)));
  }
  return days;
}

export function groupByDate(
  deadlines: UnifiedDeadline[],
): Map<string, UnifiedDeadline[]> {
  const map = new Map<string, UnifiedDeadline[]>();
  for (const d of deadlines) {
    const arr = map.get(d.date) ?? [];
    arr.push(d);
    map.set(d.date, arr);
  }
  return map;
}

export function filterDeadlines(
  deadlines: UnifiedDeadline[],
  filters: { category?: string; search?: string },
): UnifiedDeadline[] {
  const search = filters.search?.trim().toLowerCase();
  return deadlines.filter((d) => {
    if (filters.category && d.category !== filters.category) return false;
    if (search && !d.label.toLowerCase().includes(search)) return false;
    return true;
  });
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
