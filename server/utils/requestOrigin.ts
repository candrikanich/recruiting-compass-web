import { getRequestURL, type H3Event } from "h3";

// Best-effort only — callers use this to pick an emailed link's domain, which
// already has its own fallback chain. A malformed or test-stubbed event must
// never turn an email send into a thrown error.
export function getSafeRequestOrigin(event: H3Event): string | undefined {
  try {
    return getRequestURL(event).origin;
  } catch {
    return undefined;
  }
}
