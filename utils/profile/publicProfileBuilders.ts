import type { PublicMetric, PublicTeamHistoryEntry } from "~/types/models";
import { getMetricDef } from "~/utils/metrics/canonical";

export function buildPublicMetrics(
  rows: Array<{
    metric_type: string;
    display_value?: string | null;
    value?: number | null;
    unit?: string | null;
    verified?: boolean | null;
    is_primary?: boolean | null;
  }>,
): PublicMetric[] {
  const rank = (r: (typeof rows)[number]) =>
    (r.is_primary ? 0 : 1) * 10 + (r.verified ? 0 : 1);
  return [...rows]
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 6)
    .map((r) => ({
      key: r.metric_type,
      label: getMetricDef(r.metric_type).label,
      value: r.display_value ?? (r.value != null ? String(r.value) : ""),
      unit: r.unit ?? null,
      verified: !!r.verified,
    }));
}

const GRADE_FIELDS: Array<[string, string, string]> = [
  ["twelfth_grade_team", "twelfth_grade_coach", "12th Grade"],
  ["eleventh_grade_team", "eleventh_grade_coach", "11th Grade"],
  ["tenth_grade_team", "tenth_grade_coach", "10th Grade"],
  ["ninth_grade_team", "ninth_grade_coach", "9th Grade"],
];

export function buildTeamHistory(
  details: Record<string, unknown> | null,
): PublicTeamHistoryEntry[] {
  if (!details) return [];
  const out: PublicTeamHistoryEntry[] = [];
  for (const [teamKey, coachKey, level] of GRADE_FIELDS) {
    const name = details[teamKey];
    if (typeof name === "string" && name.trim()) {
      out.push({
        name: name.trim(),
        level,
        coach: (details[coachKey] as string) || null,
        contact: null,
        years: null,
      });
    }
  }
  const travel = details.travel_teams;
  if (Array.isArray(travel)) {
    for (const t of travel) {
      const name = (t as { name?: unknown }).name;
      if (typeof name === "string" && name.trim()) {
        out.push({
          name: name.trim(),
          level: "Travel",
          coach: ((t as { coach?: string }).coach) || null,
          contact: null,
          years: ((t as { years?: string }).years) || null,
        });
      }
    }
  }
  return out;
}
