/**
 * NCAA recruiting-calendar key. Each key identifies one NCAA sport calendar
 * (contact-period rules differ per sport/gender/subdivision). "Other" covers
 * app sports that have no published NCAA recruiting calendar.
 */
export type NcaaCalendarKey =
  | "MBA"
  | "WSB"
  | "MBB"
  | "WBB"
  | "FBS"
  | "FCS"
  | "XCTF"
  | "WVB"
  | "MGO"
  | "MLA"
  | "WLA"
  | "Other";

export type Division = "D1" | "D2" | "D3";

/**
 * The 17 app sport strings, copied verbatim from `utils/metrics/canonical.ts`
 * `SPORT_METRICS` keys.
 */
export type AppSport =
  | "Baseball"
  | "Softball"
  | "Basketball"
  | "Football"
  | "Soccer"
  | "Volleyball"
  | "Track & Field"
  | "Cross Country"
  | "Swimming"
  | "Golf"
  | "Tennis"
  | "Wrestling"
  | "Lacrosse"
  | "Ice Hockey"
  | "Field Hockey"
  | "Rowing"
  | "Water Polo";

/**
 * One NCAA recruiting-period window. 5-type taxonomy (spike finding): baseball
 * uses `recruiting_shutdown` (stricter than `dead` — no calls/texts/correspondence
 * at all) and has no `evaluation`; basketball/football use `evaluation`. Each
 * sport's calendar uses only its real subset. `description` preserves the
 * source legend's exact term.
 */
export interface RecruitingPeriod {
  type: "dead" | "quiet" | "contact" | "evaluation" | "recruiting_shutdown";
  start: string; // ISO date "YYYY-MM-DD"
  end: string; // ISO date "YYYY-MM-DD"
  description: string;
  confidence: "HIGH" | "MEDIUM" | "LOW"; // transcription confidence (L1/L2 audit trail)
}

/** Signing dates, test dates, application/eligibility deadlines. */
export interface CalendarMilestone {
  date: string; // ISO date "YYYY-MM-DD"
  title: string;
  type: "test" | "deadline" | "ncaa-period" | "application" | "signing";
  url?: string;
  description?: string;
}

/** One NCAA calendar key's full period + milestone set, with its citation. */
export interface SportCalendar {
  periods: RecruitingPeriod[];
  milestones: CalendarMilestone[];
  source: string; // exact NCAA PDF URL this calendar was transcribed from (Layer 1)
  verifiedOn: string; // ISO date a human last verified against the source (Layer 1 CI guard)
}
