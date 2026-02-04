/**
 * Age verification utilities for player onboarding
 *
 * The Recruiting Compass is designed for athletes 14 and older.
 * Users must have a graduation year that doesn't exceed 4 years in the future.
 */

interface AgeValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates if a player's graduation year is acceptable (must be 14+ years old).
 *
 * Age requirement: Graduation year cannot be more than 4 years in the future.
 * This ensures the player is at least 14 years old (typical freshman age).
 *
 * @param graduationYear - The player's graduation year as a number
 * @returns Object with isValid boolean and optional error message
 *
 * @example
 * validatePlayerAge(2028) // current year is 2026, age ~14 ✓
 * validatePlayerAge(2031) // current year is 2026, age ~11 ✗
 */
export const validatePlayerAge = (
  graduationYear: number,
): AgeValidationResult => {
  const currentYear = new Date().getFullYear();

  // Reject unrealistic graduation years
  if (graduationYear <= 0 || graduationYear < currentYear - 50) {
    return {
      isValid: false,
      error:
        "The Recruiting Compass is designed for athletes 14 and older. If you believe this is an error, please contact support.",
    };
  }

  const yearsUntilGraduation = graduationYear - currentYear;

  // Invalid if graduation year is more than 4 years away (under 14 years old)
  if (yearsUntilGraduation > 4) {
    return {
      isValid: false,
      error:
        "The Recruiting Compass is designed for athletes 14 and older. If you believe this is an error, please contact support.",
    };
  }

  return { isValid: true };
};
