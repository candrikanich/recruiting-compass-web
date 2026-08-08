/**
 * Single source of truth for which coach-outreach template variables an athlete
 * can edit inline (Slice 5c). Shared by the write-back endpoint
 * (server/api/athlete/profile-field.patch.ts) and the compose UI so the two
 * never drift. Only these users columns are writable — everything else in the
 * registry is read-only or link-to-section (5d).
 */

export type ProfileColSpec = { type: "text" | "int" | "numeric"; min?: number; max?: number };

export const USERS_COLUMN_PREFIX = "column:users.";

export const EDITABLE_USERS_COLUMNS: Record<string, ProfileColSpec> = {
  high_school: { type: "text" },
  club_team: { type: "text" },
  hometown_city: { type: "text" },
  hometown_state: { type: "text" },
  dominant_side: { type: "text" },
  jersey_number: { type: "text" },
  height_inches: { type: "int", min: 36, max: 96 },
  weight_lbs: { type: "int", min: 50, max: 500 },
  graduation_year: { type: "int", min: 2020, max: 2035 },
  sat_score: { type: "int", min: 400, max: 1600 },
  act_score: { type: "int", min: 1, max: 36 },
  gpa: { type: "numeric", min: 0, max: 5 },
};

/** The editable users column for a source_path, or null if it isn't inline-editable. */
export function editableColumnFor(sourcePath: string | null | undefined): string | null {
  if (!sourcePath || !sourcePath.startsWith(USERS_COLUMN_PREFIX)) return null;
  const col = sourcePath.slice(USERS_COLUMN_PREFIX.length);
  return col in EDITABLE_USERS_COLUMNS ? col : null;
}

export type CoerceResult =
  | { ok: true; value: string | number | null }
  | { ok: false; error: string };

/**
 * Coerce + validate a raw string input against a column spec. Pure (no HTTP
 * coupling) so it's unit-testable; the endpoint maps `error` to a 400.
 * Empty/whitespace clears the field (null).
 */
export function coerceProfileValue(raw: string | null, spec: ProfileColSpec): CoerceResult {
  const trimmed = raw?.trim() ?? "";
  if (trimmed === "") return { ok: true, value: null };

  if (spec.type === "text") {
    if (trimmed.length > 200) return { ok: false, error: "Value too long (max 200)" };
    return { ok: true, value: trimmed };
  }

  const n = Number(trimmed);
  if (!Number.isFinite(n)) return { ok: false, error: "Value must be a number" };
  if (spec.type === "int" && !Number.isInteger(n)) {
    return { ok: false, error: "Value must be a whole number" };
  }
  if ((spec.min != null && n < spec.min) || (spec.max != null && n > spec.max)) {
    return { ok: false, error: "Value out of range" };
  }
  return { ok: true, value: n };
}
