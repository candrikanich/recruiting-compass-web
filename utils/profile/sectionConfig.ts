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

export function isSectionVisible(
  sections: ProfileSection[],
  key: ProfileSectionKey,
): boolean {
  return sections.some((s) => s.key === key && s.visible);
}
