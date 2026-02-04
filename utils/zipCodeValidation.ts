/**
 * Zip code validation utilities for player location setup
 *
 * Validates US zip codes format (exactly 5 digits).
 */

/**
 * Validates if a zip code is in the correct format.
 *
 * Rules:
 * - Must be exactly 5 characters
 * - Must contain only numeric digits (0-9)
 * - No spaces, hyphens, or special characters
 * - Leading zeros are allowed (e.g., "00123")
 *
 * @param zip - The zip code string to validate
 * @returns true if valid US zip code format, false otherwise
 *
 * @example
 * validateZipCode("60601")   // true (Chicago)
 * validateZipCode("1234")    // false (too short)
 * validateZipCode("12345-6789") // false (extended format)
 */
export const validateZipCode = (zip: string): boolean => {
  // Must be exactly 5 characters and contain only digits
  return /^\d{5}$/.test(zip);
};
