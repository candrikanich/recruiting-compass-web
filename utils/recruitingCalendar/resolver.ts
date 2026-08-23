import type { AppSport, CalendarMilestone, Division, NcaaCalendarKey, RecruitingPeriod, SportCalendar } from "./types";
import { D1_CALENDARS, D2_ALL_SPORTS, D3_FALLBACK } from "./calendarData";
import { parseLocalDateOnly, exclusiveEndOfDay, formatLocalDateOnly } from "~/utils/localDate";
import {
  SAT_TEST_DATES_2026,
  ACT_TEST_DATES_2026,
  NCAA_DEADLINES_2026,
  NAIA_DEADLINES_2026,
  COLLEGE_APPLICATION_DEADLINES_2026,
  type Milestone as LegacyMilestone,
} from "~/utils/ncaaRecruitingCalendar";

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

  // Any remaining AppSport (currently: Tennis, Water Polo) has no published
  // NCAA recruiting calendar and no sport-specific windows in the "Other"
  // bundle — falls to the generic "Other" default.
  return "Other";
}

// ============================================================================
// Sport-aware calendar queries
// ============================================================================

/**
 * Resolves the `SportCalendar` that governs a sport's recruiting rules for a
 * division. D2 and D3 use one shared calendar regardless of sport (per the
 * NCAA's own "All Other Sports" tracks); D1 resolves per-sport via
 * `resolveCalendarKey`. `sport` is always required — no silent default.
 */
export function getSportCalendar(
  sport: AppSport,
  division: Division,
  opts?: ResolveCalendarKeyOptions,
): SportCalendar {
  if (division === "D2") return D2_ALL_SPORTS;
  if (division === "D3") return D3_FALLBACK;

  const key = resolveCalendarKey(sport, opts);
  return D1_CALENDARS[key];
}

/**
 * `dead` and `recruiting_shutdown` periods both mean "no contact permitted"
 * (recruiting_shutdown is the stricter of the two — no calls/texts/
 * correspondence either — but both block contact, which is what
 * `isDeadPeriod` answers).
 */
const BLOCKING_TYPES: ReadonlySet<RecruitingPeriod["type"]> = new Set(["dead", "recruiting_shutdown"]);

function isWithinPeriod(date: Date, period: RecruitingPeriod): boolean {
  return date >= parseLocalDateOnly(period.start) && date < exclusiveEndOfDay(period.end);
}

/** True if `date` falls within a dead (or recruiting-shutdown) period for `sport`/`division`. */
export function isDeadPeriod(
  date: Date,
  sport: AppSport,
  division: Division,
  opts?: ResolveCalendarKeyOptions,
): boolean {
  const calendar = getSportCalendar(sport, division, opts);
  return calendar.periods.some((period) => BLOCKING_TYPES.has(period.type) && isWithinPeriod(date, period));
}

/** True if `date` falls within a quiet period for `sport`/`division`. */
export function isQuietPeriod(
  date: Date,
  sport: AppSport,
  division: Division,
  opts?: ResolveCalendarKeyOptions,
): boolean {
  const calendar = getSportCalendar(sport, division, opts);
  return calendar.periods.some((period) => period.type === "quiet" && isWithinPeriod(date, period));
}

/**
 * Message describing the dead/shutdown period `date` falls within, or `null`
 * if `date` is not in one.
 */
export function getDeadPeriodMessage(
  date: Date,
  sport: AppSport,
  division: Division,
  opts?: ResolveCalendarKeyOptions,
): string | null {
  const calendar = getSportCalendar(sport, division, opts);
  const period = calendar.periods.find((p) => BLOCKING_TYPES.has(p.type) && isWithinPeriod(date, p));
  if (!period) return null;

  return `Dead period - no recruiting contact permitted per NCAA rules (${period.description})`;
}

/** The next dead/recruiting-shutdown period starting on or after `date`, or `null` if none remain. */
export function getNextDeadPeriod(
  date: Date,
  sport: AppSport,
  division: Division,
  opts?: ResolveCalendarKeyOptions,
): RecruitingPeriod | null {
  const calendar = getSportCalendar(sport, division, opts);
  const future = calendar.periods
    .filter((p) => BLOCKING_TYPES.has(p.type) && parseLocalDateOnly(p.start) >= date)
    .sort((a, b) => a.start.localeCompare(b.start));

  return future[0] ?? null;
}

function toCalendarMilestone(m: LegacyMilestone): CalendarMilestone {
  return {
    date: m.date,
    title: m.title,
    type: m.type,
    url: m.url,
    description: m.description,
  };
}

/**
 * Still-generic milestone lists (no sport-specific data): SAT/ACT test dates,
 * NCAA/NAIA eligibility deadlines, and college application deadlines. Sport
 * signing-period milestones live on each sport's own `SportCalendar` instead
 * (e.g. MBA's early-signing milestone) — deliberately excluded here.
 */
const GENERIC_MILESTONES: LegacyMilestone[] = [
  ...SAT_TEST_DATES_2026,
  ...ACT_TEST_DATES_2026,
  ...NCAA_DEADLINES_2026,
  ...NAIA_DEADLINES_2026,
  ...COLLEGE_APPLICATION_DEADLINES_2026,
];

/** Same division-scoping the legacy `getUpcomingMilestones` used: unscoped or exact/"ALL" match. */
function matchesDivision(m: LegacyMilestone, division: Division): boolean {
  return !m.division || m.division === division || m.division === "ALL";
}

export interface GetUpcomingMilestonesParams {
  sport: AppSport;
  division: Division;
  graduationYear?: number;
  limit?: number;
  opts?: ResolveCalendarKeyOptions;
  /** Overrides "now" — for testability. */
  currentDate?: Date;
}

/**
 * Upcoming milestones for `sport`/`division`: the resolved `SportCalendar`'s
 * own milestones merged with the still-generic SAT/ACT/NCAA/NAIA/application
 * deadline lists, filtered by future date, graduation-year relevance
 * (mirrors the legacy `getUpcomingMilestones` phase buckets), and division —
 * then sorted ascending and capped at `limit` (default 5).
 */
export function getUpcomingMilestones(params: GetUpcomingMilestonesParams): CalendarMilestone[] {
  const { sport, division, graduationYear, limit = 5, opts, currentDate = new Date() } = params;

  const calendar = getSportCalendar(sport, division, opts);
  const generic = GENERIC_MILESTONES.filter((m) => matchesDivision(m, division)).map(toCalendarMilestone);

  const currentDateISO = formatLocalDateOnly(currentDate);
  let combined = [...calendar.milestones, ...generic].filter((m) => m.date >= currentDateISO);

  if (graduationYear) {
    const currentYear = currentDate.getFullYear();
    if (graduationYear === currentYear + 3) {
      // Senior year
      combined = combined.filter(
        (m) => m.type === "test" || m.type === "application" || m.type === "signing" || m.type === "ncaa-period",
      );
    } else if (graduationYear === currentYear + 2) {
      // Junior year
      combined = combined.filter(
        (m) => m.type === "test" || m.type === "deadline" || m.type === "ncaa-period" || m.type === "application",
      );
    } else {
      // Freshman/Sophomore - focus on tests
      combined = combined.filter((m) => m.type === "test" || m.type === "ncaa-period");
    }
  }

  return combined.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}
