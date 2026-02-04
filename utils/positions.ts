/**
 * Baseball Position Utilities
 *
 * Provides normalization and validation for baseball positions
 * to ensure consistency across different data sources.
 */

/**
 * Canonical baseball positions (abbreviated format)
 * Used in player-details settings page
 */
export const BASEBALL_POSITIONS = [
  { value: "P", label: "P", fullName: "Pitcher" },
  { value: "C", label: "C", fullName: "Catcher" },
  { value: "1B", label: "1B", fullName: "First Base" },
  { value: "2B", label: "2B", fullName: "Second Base" },
  { value: "3B", label: "3B", fullName: "Third Base" },
  { value: "SS", label: "SS", fullName: "Shortstop" },
  { value: "LF", label: "LF", fullName: "Left Field" },
  { value: "CF", label: "CF", fullName: "Center Field" },
  { value: "RF", label: "RF", fullName: "Right Field" },
  { value: "DH", label: "DH", fullName: "Designated Hitter" },
  { value: "UTIL", label: "Utility", fullName: "Utility" },
] as const;

/**
 * Position value type (abbreviated)
 */
export type PositionValue = (typeof BASEBALL_POSITIONS)[number]["value"];

/**
 * Map of common position name variations to canonical abbreviated values
 */
const POSITION_MAPPING: Record<string, PositionValue> = {
  // Abbreviated (canonical)
  P: "P",
  C: "C",
  "1B": "1B",
  "2B": "2B",
  "3B": "3B",
  SS: "SS",
  LF: "LF",
  CF: "CF",
  RF: "RF",
  DH: "DH",
  UTIL: "UTIL",

  // Full names
  Pitcher: "P",
  Catcher: "C",
  "First Base": "1B",
  "Second Base": "2B",
  "Third Base": "3B",
  Shortstop: "SS",
  "Left Field": "LF",
  "Center Field": "CF",
  "Right Field": "RF",
  "Designated Hitter": "DH",
  Utility: "UTIL",

  // Common variations (case-insensitive handled separately)
  "1st Base": "1B",
  "2nd Base": "2B",
  "3rd Base": "3B",
  "Short Stop": "SS",
  SS: "SS",
  Leftfield: "LF",
  Centerfield: "CF",
  Rightfield: "RF",

  // Broad categories - map to utility if can't be more specific
  Infield: "UTIL",
  Outfield: "UTIL",
  IF: "UTIL",
  OF: "UTIL",
};

/**
 * Normalize a single position string to canonical abbreviated format
 *
 * @param position - Position string (any format)
 * @returns Canonical abbreviated position or null if invalid
 *
 * @example
 * normalizePosition("Pitcher") // "P"
 * normalizePosition("shortstop") // "SS"
 * normalizePosition("P") // "P"
 * normalizePosition("invalid") // null
 */
export function normalizePosition(position: string): PositionValue | null {
  if (!position || typeof position !== "string") {
    return null;
  }

  // Trim whitespace and check direct mapping first
  const trimmed = position.trim();
  if (trimmed in POSITION_MAPPING) {
    return POSITION_MAPPING[trimmed];
  }

  // Try case-insensitive match
  const lower = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(POSITION_MAPPING)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }

  // No match found
  return null;
}

/**
 * Normalize an array of position strings
 *
 * @param positions - Array of position strings (any format)
 * @returns Array of canonical abbreviated positions (duplicates removed, nulls filtered)
 *
 * @example
 * normalizePositions(["Pitcher", "Outfield", "P"]) // ["P", "UTIL"]
 * normalizePositions(["SS", "shortstop", "2B"]) // ["SS", "2B"]
 */
export function normalizePositions(
  positions: string[] | null | undefined,
): PositionValue[] {
  if (!positions || !Array.isArray(positions)) {
    return [];
  }

  const normalized = positions
    .map((p) => normalizePosition(p))
    .filter((p): p is PositionValue => p !== null);

  // Remove duplicates
  return Array.from(new Set(normalized));
}

/**
 * Check if a position value is valid (canonical abbreviated format)
 *
 * @param position - Position to validate
 * @returns True if valid canonical position
 *
 * @example
 * isValidPosition("P") // true
 * isValidPosition("Pitcher") // false (not canonical)
 * isValidPosition("invalid") // false
 */
export function isValidPosition(position: string): position is PositionValue {
  return BASEBALL_POSITIONS.some((p) => p.value === position);
}

/**
 * Get full name for an abbreviated position
 *
 * @param position - Abbreviated position value
 * @returns Full position name or the original value if not found
 *
 * @example
 * getPositionFullName("P") // "Pitcher"
 * getPositionFullName("SS") // "Shortstop"
 */
export function getPositionFullName(position: string): string {
  const found = BASEBALL_POSITIONS.find((p) => p.value === position);
  return found ? found.fullName : position;
}
