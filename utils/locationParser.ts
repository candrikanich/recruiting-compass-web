/**
 * Parse location string to extract state
 * Handles formats like "City, State" or "City, State ZIP"
 *
 * Examples:
 * - "Berea, OH" → "OH"
 * - "Fairfax, VA" → "VA"
 * - "Washington, DC" → "DC"
 * - "Boston, MA 02215" → "MA"
 */
export const extractStateFromLocation = (
  location: string | null | undefined,
): string | null => {
  if (!location || typeof location !== "string") return null;

  // Match pattern: "City, STATE" or "City, STATE ZIP"
  const match = location.match(/,\s*([A-Z]{2})(?:\s+\d{5})?(?:\s*-.*)?$/);
  return match ? match[1] : null;
};
