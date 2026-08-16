export const MINIMUM_AGE = 13;

/** Age at which a player may hold a standalone (unsupervised) account. */
export const ADULT_AGE = 18;

/**
 * Whole years between a `YYYY-MM-DD` date of birth and today.
 * Returns null when the input is missing or not a valid calendar date.
 */
export function ageFromDateOfBirth(
  dateOfBirth: string | null | undefined,
): number | null {
  if (!dateOfBirth) return null;

  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/** True only when a DOB is present AND resolves to an age below 13. */
export function isUnderMinimumAge(
  dateOfBirth: string | null | undefined,
): boolean {
  const age = ageFromDateOfBirth(dateOfBirth);
  return age !== null && age < MINIMUM_AGE;
}

/**
 * True when a DOB is present AND resolves to the 13–17 band (inclusive) — a minor
 * who may use the Service only through a parent/guardian family invitation, not a
 * standalone signup. Fails open (false) on missing/invalid DOB and for under-13
 * (that band is handled by {@link isUnderMinimumAge}).
 */
export function requiresGuardianInvite(
  dateOfBirth: string | null | undefined,
): boolean {
  const age = ageFromDateOfBirth(dateOfBirth);
  return age !== null && age >= MINIMUM_AGE && age < ADULT_AGE;
}
