/**
 * NCAA Recruiting Calendar utility for managing dead periods and recruiting windows
 * Reference: NCAA Division I Baseball Recruiting Rules
 * 2026 Calendar dates based on official NCAA guidelines
 */

export interface RecruitingPeriod {
  type: "dead" | "quiet" | "contact" | "evaluation";
  start: Date;
  end: Date;
  division: "D1" | "D2" | "D3";
  description: string;
}

/**
 * NCAA Division I Baseball Recruiting Calendar for 2026
 * Dead periods = No recruiting contact allowed
 * Quiet periods = Limited contact, no in-person visits
 * Contact/Evaluation = Normal recruiting allowed
 */
export const RECRUITING_CALENDAR_2026: RecruitingPeriod[] = [
  // Dead Periods (No contact permitted)
  {
    type: "dead",
    start: new Date("2026-11-22"),
    end: new Date("2026-11-29"),
    division: "D1",
    description: "Thanksgiving Break",
  },
  {
    type: "dead",
    start: new Date("2026-12-20"),
    end: new Date("2027-01-03"),
    division: "D1",
    description: "Winter Break",
  },
  {
    type: "dead",
    start: new Date("2027-03-15"),
    end: new Date("2027-04-10"),
    division: "D1",
    description: "Spring Break / Early Season",
  },

  // Quiet Periods (Limited contact only)
  {
    type: "quiet",
    start: new Date("2026-09-01"),
    end: new Date("2026-09-10"),
    division: "D1",
    description: "Dead Period for Freshmen",
  },
];

/**
 * Check if a given date falls within a dead period
 * @param date - Date to check
 * @param division - NCAA division (default: D1)
 * @returns true if date is during a dead period
 */
export function isDeadPeriod(
  date: Date,
  division: "D1" | "D2" | "D3" = "D1",
): boolean {
  return RECRUITING_CALENDAR_2026.some(
    (period) =>
      period.type === "dead" &&
      period.division === division &&
      date >= period.start &&
      date <= period.end,
  );
}

/**
 * Check if a given date falls within a quiet period
 * @param date - Date to check
 * @param division - NCAA division (default: D1)
 * @returns true if date is during a quiet period
 */
export function isQuietPeriod(
  date: Date,
  division: "D1" | "D2" | "D3" = "D1",
): boolean {
  return RECRUITING_CALENDAR_2026.some(
    (period) =>
      period.type === "quiet" &&
      period.division === division &&
      date >= period.start &&
      date <= period.end,
  );
}

/**
 * Get the message for a dead period at a given date
 * @param date - Date to check
 * @param division - NCAA division (default: D1)
 * @returns Message describing the dead period, or null if not in dead period
 */
export function getDeadPeriodMessage(
  date: Date,
  division: "D1" | "D2" | "D3" = "D1",
): string | null {
  const period = RECRUITING_CALENDAR_2026.find(
    (p) =>
      p.type === "dead" &&
      p.division === division &&
      date >= p.start &&
      date <= p.end,
  );

  if (!period) return null;

  return `Dead period - no recruiting contact permitted per NCAA rules (${period.description})`;
}

/**
 * Get the next dead period from a given date
 * @param date - Starting date to check from (default: today)
 * @param division - NCAA division (default: D1)
 * @returns Next dead period or null if none found
 */
export function getNextDeadPeriod(
  date: Date = new Date(),
  division: "D1" | "D2" | "D3" = "D1",
): RecruitingPeriod | null {
  const futurePeriods = RECRUITING_CALENDAR_2026.filter(
    (p) =>
      p.type === "dead" &&
      p.division === division &&
      p.start >= date,
  );

  if (futurePeriods.length === 0) return null;

  return futurePeriods.sort((a, b) => a.start.getTime() - b.start.getTime())[0];
}

/**
 * Get all recruiting periods for a division
 * @param division - NCAA division (default: D1)
 * @returns Array of recruiting periods
 */
export function getRecruitingCalendar(
  division: "D1" | "D2" | "D3" = "D1",
): RecruitingPeriod[] {
  return RECRUITING_CALENDAR_2026.filter((p) => p.division === division);
}
