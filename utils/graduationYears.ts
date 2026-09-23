/**
 * Canonical graduation-year options for onboarding (web + iOS parity).
 *
 * Floor uses the same July 1 roll pivot as `calculateCurrentGrade` in
 * gradeHelpers.ts: through June the just-graduated class is still a valid pick,
 * but from July 1 it rolls off so the current freshman class isn't pushed past
 * the front of the range. The ceiling stays pinned to the raw calendar year + 5
 * (not floor + 5) — this endpoint is the canonical range the shared
 * `/api/auth/signup-minor` validation and iOS both check against, so a sliding
 * ceiling would let the window drift; instead the window shrinks to 5 years
 * (not 6) from July through December. Matches iOS
 * `GradeLevelHelper.allowedGraduationYears(referenceDate:)`.
 *
 * Age eligibility itself is enforced separately by the 13+ COPPA gate
 * (see utils/age.ts and the users table trigger); grad year is a UX affordance,
 * not an age check.
 *
 * Pivot is computed in UTC, not local time. A `Date` is a single absolute
 * instant, so UTC getters agree everywhere regardless of the caller's clock
 * timezone — local getters would let a browser/device west of UTC and the
 * server disagree about whether July 1 has arrived yet, letting the client
 * offer a year this same function (called again, server-side, for
 * `/api/auth/signup-minor` validation) would reject.
 */
export const GRAD_YEARS_AHEAD = 5;

export function getGraduationYearOptions(now: Date = new Date()): number[] {
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const floor = currentMonth >= 7 ? currentYear + 1 : currentYear;
  const ceiling = currentYear + GRAD_YEARS_AHEAD;
  return Array.from(
    { length: ceiling - floor + 1 },
    (_, i) => floor + i,
  );
}
