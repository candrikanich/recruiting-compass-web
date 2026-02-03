/**
 * NCAA Recruiting Calendar utility for managing dead periods, recruiting windows, and important milestones
 * Reference: NCAA Division I Baseball Recruiting Rules
 * 2026-2027 Calendar dates based on official NCAA guidelines and standardized testing calendars
 */

import type { Phase, Division } from "~/types/timeline";

export interface RecruitingPeriod {
  type: "dead" | "quiet" | "contact" | "evaluation";
  start: Date;
  end: Date;
  division: "D1" | "D2" | "D3";
  description: string;
}

export interface Milestone {
  date: string; // ISO date string
  title: string;
  type: "test" | "deadline" | "ncaa-period" | "application" | "signing";
  division?: Division | "ALL";
  url?: string;
  description?: string;
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
    (p) => p.type === "dead" && p.division === division && p.start >= date,
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

// ============================================================================
// MILESTONE CALENDAR - Important dates for recruiting timeline
// ============================================================================

export const SAT_TEST_DATES_2026: Milestone[] = [
  {
    date: "2026-03-14",
    title: "SAT Test Date",
    type: "test",
    division: "ALL",
    url: "https://collegereadiness.collegeboard.org/sat/register/dates-deadlines",
  },
  {
    date: "2026-05-02",
    title: "SAT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2026-06-06",
    title: "SAT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2026-08-29",
    title: "SAT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2026-10-03",
    title: "SAT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2026-11-07",
    title: "SAT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2027-01-23",
    title: "SAT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2027-03-13",
    title: "SAT Test Date",
    type: "test",
    division: "ALL",
  },
];

export const ACT_TEST_DATES_2026: Milestone[] = [
  {
    date: "2026-02-07",
    title: "ACT Test Date",
    type: "test",
    division: "ALL",
    url: "https://www.act.org/content/act/en/students/register-for-the-act.html",
  },
  {
    date: "2026-04-11",
    title: "ACT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2026-06-13",
    title: "ACT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2026-07-18",
    title: "ACT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2026-09-12",
    title: "ACT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2026-10-10",
    title: "ACT Test Date",
    type: "test",
    division: "ALL",
  },
  {
    date: "2027-02-06",
    title: "ACT Test Date",
    type: "test",
    division: "ALL",
  },
];

export const NCAA_DEADLINES_2026: Milestone[] = [
  {
    date: "2026-04-01",
    title: "NCAA Eligibility Center Registration - Juniors",
    type: "deadline",
    division: "DI" as const,
    url: "https://www.eligibilitycenter.org/",
    description: "Register with NCAA to begin eligibility evaluation",
  },
  {
    date: "2026-06-15",
    title: "D1 Contact Period Begins",
    type: "ncaa-period",
    division: "DI" as const,
    description: "NCAA allows recruiting contact to begin for juniors",
  },
];

export const NAIA_DEADLINES_2026: Milestone[] = [
  {
    date: "2026-09-01",
    title: "NAIA Eligibility Center Registration",
    type: "deadline",
    division: "NAIA",
    url: "https://www.playnaia.org/",
    description: "Register with NAIA eligibility center",
  },
];

export const COLLEGE_APPLICATION_DEADLINES_2026: Milestone[] = [
  {
    date: "2026-10-01",
    title: "FAFSA Opens",
    type: "application",
    division: "ALL",
    url: "https://studentaid.gov/h/apply-for-aid/fafsa",
    description:
      "Free Application for Federal Student Aid opens for 2027-28 school year",
  },
  {
    date: "2026-11-01",
    title: "Early Decision Deadline (Early)",
    type: "application",
    division: "ALL",
    description: "Most early decision deadlines for senior fall",
  },
  {
    date: "2026-11-15",
    title: "Early Action Deadline",
    type: "application",
    division: "ALL",
    description: "Most early action deadlines",
  },
  {
    date: "2027-01-01",
    title: "Regular Decision Deadline (Most Selective)",
    type: "application",
    division: "ALL",
    description: "Most selective schools' regular decision deadline",
  },
  {
    date: "2027-01-15",
    title: "Regular Decision Deadline (Typical)",
    type: "application",
    division: "ALL",
    description: "Most schools' regular decision deadline",
  },
  {
    date: "2027-02-01",
    title: "Regular Decision Deadline (Latest)",
    type: "application",
    division: "ALL",
    description: "Latest regular decision deadlines for selective schools",
  },
];

export const BASEBALL_SIGNING_PERIODS_2026: Milestone[] = [
  {
    date: "2026-11-11",
    title: "Early Signing Period Begins",
    type: "signing",
    division: "D1",
    description: "D1 early national signing period (Nov 11-13, 2026)",
  },
  {
    date: "2026-11-13",
    title: "Early Signing Period Ends",
    type: "signing",
    division: "D1",
  },
  {
    date: "2027-02-03",
    title: "Regular Signing Period Begins",
    type: "signing",
    division: "D1",
    description: "D1 regular signing period begins",
  },
  {
    date: "2027-04-15",
    title: "Regular Signing Period Ends",
    type: "signing",
    division: "D1",
    description: "D1 regular signing period ends",
  },
];

export const ALL_MILESTONES: Milestone[] = [
  ...SAT_TEST_DATES_2026,
  ...ACT_TEST_DATES_2026,
  ...NCAA_DEADLINES_2026,
  ...NAIA_DEADLINES_2026,
  ...COLLEGE_APPLICATION_DEADLINES_2026,
  ...BASEBALL_SIGNING_PERIODS_2026,
];

/**
 * Get upcoming milestones filtered by date, phase, and division
 * @param params - Configuration object
 * @returns Array of upcoming milestones, sorted by date
 */
export function getUpcomingMilestones(params: {
  currentDate?: Date;
  phase?: Phase;
  graduationYear?: number;
  division?: Division;
  limit?: number;
}): Milestone[] {
  const {
    currentDate = new Date(),
    graduationYear,
    division,
    limit = 5,
  } = params;

  const currentDateISO = currentDate.toISOString().split("T")[0];

  // Filter milestones that are in the future
  let filtered = ALL_MILESTONES.filter((m) => m.date >= currentDateISO);

  // Filter by graduation year relevance (only show relevant years)
  if (graduationYear) {
    // Freshmen (Grade 9): show current year tests + next year tests
    // Sophomores (Grade 10): show current year tests + next year tests
    // Juniors (Grade 11): show current + next year tests + application deadlines
    // Seniors (Grade 12): show this year tests + application deadlines + signing periods
    const currentYear = currentDate.getFullYear();

    if (graduationYear === currentYear + 3) {
      // Senior year
      filtered = filtered.filter(
        (m) =>
          m.type === "test" ||
          m.type === "application" ||
          m.type === "signing" ||
          m.type === "ncaa-period",
      );
    } else if (graduationYear === currentYear + 2) {
      // Junior year
      filtered = filtered.filter(
        (m) =>
          m.type === "test" ||
          m.type === "deadline" ||
          m.type === "ncaa-period" ||
          m.type === "application",
      );
    } else {
      // Freshman/Sophomore - focus on tests
      filtered = filtered.filter(
        (m) => m.type === "test" || m.type === "ncaa-period",
      );
    }
  }

  // Filter by division if provided
  if (division) {
    filtered = filtered.filter(
      (m) => !m.division || m.division === division || m.division === "ALL",
    );
  } else {
    // Show all divisions
    filtered = filtered.filter((m) => !m.division || m.division === "ALL");
  }

  // Sort by date and apply limit
  return filtered.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

/**
 * Get milestone by date range
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Milestones within date range
 */
export function getMilestonesByDateRange(
  startDate: string,
  endDate: string,
): Milestone[] {
  return ALL_MILESTONES.filter(
    (m) => m.date >= startDate && m.date <= endDate,
  ).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get milestone type icon
 * @param type - Milestone type
 * @returns Emoji icon for type
 */
export function getMilestoneTypeIcon(type: Milestone["type"]): string {
  const icons: Record<Milestone["type"], string> = {
    test: "📝",
    deadline: "⏰",
    "ncaa-period": "📋",
    application: "📧",
    signing: "✍️",
  };
  return icons[type] || "📅";
}
