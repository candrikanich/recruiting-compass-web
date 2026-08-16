/**
 * Sanitize an untrusted "back"/redirect target into a safe same-origin path.
 * Rejects protocol-relative (`//host`), absolute (`https://`), backslash, and
 * non-slash-leading values — all open-redirect vectors — returning `fallback`.
 */
export function safeInternalPath(raw: unknown, fallback = "/coaches"): string {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  // Must start with exactly one forward slash.
  if (raw[0] !== "/") return fallback;
  // Reject protocol-relative and backslash tricks: `//`, `/\`.
  if (raw[1] === "/" || raw[1] === "\\") return fallback;
  // Reject any scheme or backslash anywhere.
  if (raw.includes(":") || raw.includes("\\")) return fallback;
  return raw;
}
