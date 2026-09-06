export interface ScholarshipLimit {
  sport: string;
  division: string;
  total: number | null;
  head_count: number | null;
  equivalency: number | null;
  notes: string | null;
}

/**
 * Exact (sport, division) match only — the scholarship_limits table has no
 * wildcard-sport row convention (unlike contact_window_rules), so a miss
 * simply means no scholarship line renders.
 */
export function selectScholarshipLimit(
  rows: ScholarshipLimit[],
  sport: string | null | undefined,
  division: string | null | undefined,
): ScholarshipLimit | null {
  if (!sport || !division) return null;
  const normalizedSport = sport.toLowerCase();
  return (
    rows.find(
      (row) =>
        row.sport.toLowerCase() === normalizedSport &&
        row.division === division,
    ) ?? null
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * "Athletic Scholarships: 11.7 equivalency (D1 Baseball)" — equivalency
 * sports show the fractional scholarship count; head-count sports show a
 * whole roster-spot count; `total` is the fallback when neither is set.
 */
export function formatScholarshipLine(
  limit: ScholarshipLimit,
  sport: string,
  division: string,
): string {
  const detail = `(${division} ${capitalize(sport)})`;
  if (limit.equivalency != null) {
    return `Athletic Scholarships: ${limit.equivalency} equivalency ${detail}`;
  }
  if (limit.head_count != null) {
    return `Athletic Scholarships: ${limit.head_count} head-count ${detail}`;
  }
  if (limit.total != null) {
    return `Athletic Scholarships: ${limit.total} total ${detail}`;
  }
  return `Athletic Scholarships: see ${detail}`;
}
