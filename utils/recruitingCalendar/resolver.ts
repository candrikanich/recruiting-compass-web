import type { AppSport, NcaaCalendarKey } from "./types";

export interface ResolveCalendarKeyOptions {
  gender?: string | null;
  footballSubdivision?: "FBS" | "FCS";
}

/**
 * Sports with a single NCAA recruiting calendar (no gender split). Includes
 * three "Other"-bundle sports whose PDF enumerates real dead/quiet/
 * recruiting_shutdown windows with no men's/women's split: Swimming (combined
 * "Swimming and Diving" table) and the two NCAA women's-only sports Rowing
 * and Field Hockey.
 */
const SINGLE_CALENDAR_SPORTS: Partial<Record<AppSport, NcaaCalendarKey>> = {
  Baseball: "MBA",
  Softball: "WSB",
  Volleyball: "WVB",
  "Track & Field": "XCTF",
  "Cross Country": "XCTF",
  Swimming: "OTHER_SWIM",
  Rowing: "OTHER_ROWING",
  "Field Hockey": "OTHER_FIELDHOCKEY",
};

/**
 * Sports with distinct men's/women's NCAA calendars. Soccer, Ice Hockey, and
 * Wrestling are "Other"-bundle sports whose PDF enumerates separate men's/
 * women's windows (see calendarData.ts OTHER_MSOCCER/OTHER_WSOCCER/
 * OTHER_MICEHOCKEY/OTHER_WICEHOCKEY/OTHER_MWRESTLING/OTHER_WWRESTLING).
 */
const GENDER_SPLIT_SPORTS: Partial<Record<AppSport, { men: NcaaCalendarKey; women: NcaaCalendarKey }>> = {
  Basketball: { men: "MBB", women: "WBB" },
  Lacrosse: { men: "MLA", women: "WLA" },
  Soccer: { men: "OTHER_MSOCCER", women: "OTHER_WSOCCER" },
  "Ice Hockey": { men: "OTHER_MICEHOCKEY", women: "OTHER_WICEHOCKEY" },
  Wrestling: { men: "OTHER_MWRESTLING", women: "OTHER_WWRESTLING" },
};

/**
 * App sports with no published NCAA recruiting calendar AND no sport-specific
 * windows in the "Other" bundle — always the generic "Other" default.
 */
const NO_CALENDAR_SPORTS: ReadonlySet<AppSport> = new Set<AppSport>(["Tennis", "Water Polo"]);

const isMen = (gender: string | null | undefined): boolean => gender !== "female";

/**
 * Maps an app sport (plus optional gender/football-subdivision context) to
 * the NCAA recruiting-calendar key that governs its contact-period rules.
 *
 * Gender defaults to men's whenever the sport is gender-split and gender is
 * null, unspecified, "other", or "prefer_not_to_say".
 */
export function resolveCalendarKey(sport: AppSport, opts?: ResolveCalendarKeyOptions): NcaaCalendarKey {
  const gender = opts?.gender;

  if (sport === "Football") {
    return opts?.footballSubdivision ?? "FBS";
  }

  if (sport === "Golf") {
    return isMen(gender) ? "MGO" : "Other";
  }

  const genderSplit = GENDER_SPLIT_SPORTS[sport];
  if (genderSplit) {
    return isMen(gender) ? genderSplit.men : genderSplit.women;
  }

  const single = SINGLE_CALENDAR_SPORTS[sport];
  if (single) {
    return single;
  }

  if (NO_CALENDAR_SPORTS.has(sport)) {
    return "Other";
  }

  return "Other";
}
