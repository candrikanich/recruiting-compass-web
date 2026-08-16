export const MINIMUM_AGE = 13;

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
