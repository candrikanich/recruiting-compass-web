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
