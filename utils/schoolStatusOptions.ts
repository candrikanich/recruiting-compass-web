/**
 * Canonical recruiting-status vocabulary — the single source of truth shared by
 * the detail header pill, the sidebar "Recruiting Status" dropdown, and the
 * status-history badges. Kept in lock-step with the iOS SchoolStatus enum
 * (values, labels, and 100/700 badge palette) for web ↔ iOS parity.
 *
 * `unknown` and `declined` exist in the DB enum as fallbacks/legacy but are NOT
 * user-selectable here.
 */

export type SchoolStatusValue =
  | "researching"
  | "interested"
  | "contacted"
  | "camp_invite"
  | "recruited"
  | "official_visit_invited"
  | "official_visit_scheduled"
  | "offer_received"
  | "committed"
  | "not_pursuing";

export interface SchoolStatusOption {
  value: SchoolStatusValue;
  label: string;
  badgeClass: string;
}

/** Ordered as a recruiting funnel; drives the dropdown option order. */
export const SCHOOL_STATUS_OPTIONS: readonly SchoolStatusOption[] = [
  {
    value: "researching",
    label: "Researching",
    badgeClass: "bg-slate-100 text-slate-700",
  },
  {
    value: "interested",
    label: "Interested",
    badgeClass: "bg-slate-100 text-slate-700",
  },
  {
    value: "contacted",
    label: "Contacted",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  {
    value: "camp_invite",
    label: "Camp Invite",
    badgeClass: "bg-purple-100 text-purple-700",
  },
  {
    value: "recruited",
    label: "Recruited",
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "official_visit_invited",
    label: "Official Visit Invited",
    badgeClass: "bg-orange-100 text-orange-700",
  },
  {
    value: "official_visit_scheduled",
    label: "Official Visit Scheduled",
    badgeClass: "bg-orange-100 text-orange-700",
  },
  {
    value: "offer_received",
    label: "Offer Received",
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "committed",
    label: "Committed",
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "not_pursuing",
    label: "Not Pursuing",
    badgeClass: "bg-red-100 text-red-700",
  },
] as const;

const OPTION_BY_VALUE = new Map(
  SCHOOL_STATUS_OPTIONS.map((option) => [option.value, option]),
);

const FALLBACK_BADGE_CLASS = "bg-slate-100 text-slate-700";

/** Human label for a status value; falls back to Title-Cased snake_case. */
export function getSchoolStatusLabel(status: string): string {
  const option = OPTION_BY_VALUE.get(status as SchoolStatusValue);
  if (option) return option.label;
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Tailwind badge classes for a status value; safe for legacy/unknown values. */
export function getSchoolStatusBadgeClass(status: string): string {
  return (
    OPTION_BY_VALUE.get(status as SchoolStatusValue)?.badgeClass ??
    FALLBACK_BADGE_CLASS
  );
}
