import type { PublicMetric, PublicTeamHistoryEntry } from "~/types/models";
import { getMetricDef, applyFormat } from "~/utils/metrics/canonical";

export function buildPublicMetrics(
  rows: Array<{
    metric_type: string;
    display_value?: string | null;
    value?: number | null;
    unit?: string | null;
    verified?: boolean | null;
    is_primary?: boolean | null;
    created_at?: string | null;
  }>,
): PublicMetric[] {
  // A player can log the same metric_type more than once (e.g. two velocity
  // readings). The public profile shows one card per type — keep the newest
  // row (most-recent created_at; ISO strings sort lexicographically).
  const newestByType = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const prev = newestByType.get(r.metric_type);
    if (!prev || (r.created_at ?? "") > (prev.created_at ?? "")) {
      newestByType.set(r.metric_type, r);
    }
  }

  const rank = (r: (typeof rows)[number]) =>
    (r.is_primary ? 0 : 1) * 10 + (r.verified ? 0 : 1);

  return [...newestByType.values()]
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 6)
    .map((r) => {
      const def = getMetricDef(r.metric_type);
      // Value + unit come from the canonical registry, not the stored row:
      // the DB `unit`/`display_value` columns carry stale/garbage data (e.g.
      // batting_avg stored unit "unit"). applyFormat gives the correct render
      // (batting_avg 0.41 -> ".410", unit ""); fall back to the raw value only
      // when it isn't numeric.
      // Number(null) and Number("") are 0 (finite) — a missing value must not
      // masquerade as a real 0.00 reading, so treat null/undefined as non-numeric.
      const num = r.value == null ? NaN : Number(r.value);
      const value = Number.isFinite(num)
        ? applyFormat(def.format, num)
        : (r.display_value ?? (r.value != null ? String(r.value) : ""));
      return {
        key: r.metric_type,
        label: def.label,
        value,
        unit: def.unit || null,
        verified: !!r.verified,
      };
    });
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
      const coach = details[coachKey];
      out.push({
        name: name.trim(),
        level,
        coach: typeof coach === "string" ? coach : null,
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
        const tObj = t as Record<string, unknown>;
        const coach = tObj.coach;
        const years = tObj.years;
        out.push({
          name: name.trim(),
          level: "Travel",
          coach: typeof coach === "string" ? coach : null,
          contact: null,
          years: typeof years === "string" ? years : null,
        });
      }
    }
  }
  return out;
}
