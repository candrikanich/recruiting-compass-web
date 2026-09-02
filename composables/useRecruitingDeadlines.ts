import { computed } from "vue";
import type { UnifiedDeadline } from "~/types/deadline";
import type { Division, AppSport, CalendarMilestone } from "~/utils/recruitingCalendar/types";
import { getUpcomingMilestones, getSportCalendar } from "~/utils/recruitingCalendar/resolver";
import { SEASON_END } from "~/utils/recruitingCalendar/calendarData";
import { ALL_MILESTONES } from "~/utils/ncaaRecruitingCalendar";

function milestoneToDeadline(m: CalendarMilestone): UnifiedDeadline {
  const slug = m.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+$/, "");
  return {
    id: `milestone-${m.date}-${slug}`,
    label: m.title,
    date: m.date,
    category: m.type,
    source: "system",
    description: m.description,
    url: m.url,
  };
}

/**
 * Resolves system (NCAA/testing) calendar deadlines from TS data — no API
 * calls, no DB. Callers supply reactive getters for sport, tracked school
 * divisions, and graduation year so this stays decoupled from any specific
 * store.
 */
export function useRecruitingDeadlines(
  sport: () => AppSport | null,
  divisions: () => Division[],
  graduationYear: () => number | null,
) {
  const isStale = computed(() => new Date() > SEASON_END);

  const systemDeadlines = computed<UnifiedDeadline[]>(() => {
    const s = sport();
    const divs = divisions();
    const gy = graduationYear();

    if (!s || divs.length === 0) return [];

    const seen = new Set<string>();
    const result: UnifiedDeadline[] = [];

    // 1. Sport-specific milestones per division (union across tracked divisions)
    for (const div of divs) {
      const milestones = getUpcomingMilestones({
        sport: s,
        division: div,
        graduationYear: gy ?? undefined,
        limit: 100,
      });
      for (const m of milestones) {
        const deadline = milestoneToDeadline(m);
        const key = `${deadline.date}|${deadline.label}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ ...deadline, sport: s, division: div });
        }
      }

      // 2. Dead/recruiting_shutdown period starts
      const cal = getSportCalendar(s, div);
      for (const p of cal.periods) {
        if (p.type !== "dead" && p.type !== "recruiting_shutdown") continue;
        const key = `${p.start}|${p.description}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const typeLabel = p.type === "dead" ? "Dead Period" : "Recruiting Shutdown";
        result.push({
          id: `system-${div}-${p.type}-${p.start}`,
          label: `${div} ${s} ${typeLabel}`,
          date: p.start,
          endDate: p.end,
          category: "ncaa-period",
          source: "system",
          sport: s,
          division: div,
          description: p.description,
        });
      }
    }

    // 3. Generic milestones (SAT/ACT/FAFSA/etc) — sport/division agnostic
    const now = new Date().toISOString().slice(0, 10);
    for (const m of ALL_MILESTONES) {
      if (m.date < now) continue;
      const deadline = milestoneToDeadline(m as CalendarMilestone);
      const key = `${deadline.date}|${deadline.label}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(deadline);
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  });

  return { systemDeadlines, isStale };
}
