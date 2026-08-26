import type { ProfileSection, ProfileSectionKey } from "~/types/models";

export const DEFAULT_SECTION_ORDER: ProfileSectionKey[] = [
  "metrics",
  "film",
  "academics",
  "values",
  "team_history",
  "awards",
];

const KNOWN = new Set<ProfileSectionKey>(DEFAULT_SECTION_ORDER);

export function backfillSectionConfig(flags: {
  show_metrics?: boolean;
  show_film?: boolean;
  show_academics?: boolean;
}): ProfileSection[] {
  const visibleByKey: Record<ProfileSectionKey, boolean> = {
    metrics: !!flags.show_metrics,
    film: !!flags.show_film,
    academics: !!flags.show_academics,
    values: true,
    team_history: true,
    awards: true,
  };
  return DEFAULT_SECTION_ORDER.map((key) => ({ key, visible: visibleByKey[key] }));
}

export function normalizeSectionConfig(raw: unknown): ProfileSection[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<ProfileSectionKey>();
  const ordered: ProfileSection[] = [];
  for (const item of list) {
    const key = (item as { key?: unknown })?.key;
    if (typeof key !== "string" || !KNOWN.has(key as ProfileSectionKey)) continue;
    const k = key as ProfileSectionKey;
    if (seen.has(k)) continue;
    seen.add(k);
    ordered.push({ key: k, visible: !!(item as { visible?: unknown }).visible });
  }
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!seen.has(key)) ordered.push({ key, visible: false });
  }
  return ordered;
}

/**
 * Section visibility resolver for the public endpoint. `show_metrics`/
 * `show_film`/`show_academics` are Phase 1's only editable visibility
 * controls (see server/api/player/profile.put.ts), so they are always
 * authoritative for their three keys — even when a stored `section_config`
 * disagrees, e.g. after an owner flips a show_* toggle without a
 * section_config-editing UI to keep the two in sync. `section_config` falls
 * back to a show_*-seeded backfill when absent/empty (new profiles default
 * to `[]`, which would otherwise hide every section).
 */
export function resolveSections(input: {
  section_config: unknown;
  show_metrics?: boolean | null;
  show_film?: boolean | null;
  show_academics?: boolean | null;
}): ProfileSection[] {
  const base =
    Array.isArray(input.section_config) && input.section_config.length > 0
      ? normalizeSectionConfig(input.section_config)
      : backfillSectionConfig({
          show_metrics: !!input.show_metrics,
          show_film: !!input.show_film,
          show_academics: !!input.show_academics,
        });

  const overrides: Partial<Record<ProfileSectionKey, boolean>> = {
    metrics: !!input.show_metrics,
    film: !!input.show_film,
    academics: !!input.show_academics,
  };
  return base.map((section) =>
    section.key in overrides
      ? { ...section, visible: overrides[section.key]! }
      : section,
  );
}

export function isSectionVisible(
  sections: ProfileSection[],
  key: ProfileSectionKey,
): boolean {
  return sections.some((s) => s.key === key && s.visible);
}
