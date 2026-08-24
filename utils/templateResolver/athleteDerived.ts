/**
 * Pure derivations for the athlete template context, extracted from
 * composables/useTemplateResolver.ts so the grade/HS-coach/position logic is
 * unit-testable without a Supabase mock. No I/O — callers fetch, these transform.
 */

import {
  formatPositionsShort,
  primaryAndSecondary,
  abbreviatePosition,
} from "~/utils/positions/canonical";

const GRADE_WORDS: Record<number, string> = {
  12: "twelfth",
  11: "eleventh",
  10: "tenth",
  9: "ninth",
};

/** Current HS grade (9–12) from graduation year, accounting for fall vs spring semester. */
export const currentGrade = (
  gradYear: number | null | undefined,
  now = new Date(),
): number | null => {
  if (!gradYear) return null;
  const schoolYearEnd =
    now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
  return 12 - (gradYear - schoolYearEnd);
};

/** Grade-appropriate HS coach from the player jsonb, else most-recent (12th→9th). */
export const pickHsCoach = (
  prefs: Record<string, unknown>,
  gradYear: number | null | undefined,
): string | null => {
  const grade = currentGrade(gradYear);
  const clamped = grade != null ? Math.min(12, Math.max(9, grade)) : null;
  const fallback = [12, 11, 10, 9];
  const order =
    clamped != null
      ? [clamped, ...fallback.filter((g) => g !== clamped)]
      : fallback;
  for (const g of order) {
    const v = prefs[`${GRADE_WORDS[g]}_grade_coach`];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
};

/**
 * Coach-facing position values from the athlete's ENTERED, ordered positions[]
 * (positions[0] = primary, next distinct = secondary), abbreviated per sport
 * ("3B/SS"). The legacy `primary_position` string is only a last-resort fallback
 * for accounts that predate ordered positions. Keys are omitted when empty so
 * the template variable renders as nothing rather than a stray value.
 */
export const derivePositions = (
  sport: string | undefined,
  prefs: Record<string, unknown>,
): { position?: string; positionSecondary?: string } => {
  const positionList = Array.isArray(prefs.positions)
    ? (prefs.positions as unknown[]).filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0,
      )
    : [];
  const primaryFallback =
    typeof prefs.primary_position === "string" ? prefs.primary_position : null;

  const out: { position?: string; positionSecondary?: string } = {};
  const combined = formatPositionsShort(sport, positionList, primaryFallback);
  if (combined) out.position = combined;
  const { secondary } = primaryAndSecondary(positionList, primaryFallback);
  if (secondary) out.positionSecondary = abbreviatePosition(sport, secondary);
  return out;
};
