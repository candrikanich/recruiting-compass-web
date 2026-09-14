import conferenceUrls from "~/data/conferenceUrls.json";

/**
 * Auto-resolved conference website lookup — not user-editable (see
 * docs/superpowers/specs/2026-09-02-school-data-enrichment-design.md).
 * Client-side static data, exact match against schools.conference.
 */
export function getConferenceUrl(
  conference: string | null | undefined,
): string | null {
  if (!conference) return null;
  return (conferenceUrls as Record<string, string>)[conference] ?? null;
}
