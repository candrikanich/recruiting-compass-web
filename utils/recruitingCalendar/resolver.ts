import type { AppSport, NcaaCalendarKey } from "./types";

export interface ResolveCalendarKeyOptions {
  gender?: string | null;
  footballSubdivision?: "FBS" | "FCS";
}

/** Sports with a single NCAA recruiting calendar (no gender split). */
const SINGLE_CALENDAR_SPORTS: Partial<Record<AppSport, NcaaCalendarKey>> = {
  Baseball: "MBA",
  Softball: "WSB",
  Volleyball: "WVB",
  "Track & Field": "XCTF",
  "Cross Country": "XCTF",
};

/** Sports with distinct men's/women's NCAA calendars. */
const GENDER_SPLIT_SPORTS: Partial<Record<AppSport, { men: NcaaCalendarKey; women: NcaaCalendarKey }>> = {
  Basketball: { men: "MBB", women: "WBB" },
  Lacrosse: { men: "MLA", women: "WLA" },
};

/** App sports with no published NCAA recruiting calendar — always "Other". */
const NO_CALENDAR_SPORTS: ReadonlySet<AppSport> = new Set<AppSport>([
  "Soccer",
  "Swimming",
  "Tennis",
  "Wrestling",
  "Ice Hockey",
  "Field Hockey",
  "Rowing",
  "Water Polo",
]);

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
