/**
 * Canonical graduation-year options for onboarding (web + iOS parity).
 *
 * Range = current calendar year through current year + 5, inclusive (6 options).
 * The upper bound (+5) is what lets rising 8th graders — the youngest athletes we
 * accept, who graduate roughly five years out — pick their class. The lower bound
 * (current year) covers this year's graduating seniors.
 *
 * Age eligibility itself is enforced separately by the 13+ COPPA gate
 * (see utils/age.ts and the users table trigger); grad year is a UX affordance,
 * not an age check.
 */
export const GRAD_YEARS_AHEAD = 5;

export function getGraduationYearOptions(now: Date = new Date()): number[] {
  const currentYear = now.getFullYear();
  return Array.from(
    { length: GRAD_YEARS_AHEAD + 1 },
    (_, i) => currentYear + i,
  );
}
