/**
 * Per-sport / per-division NCAA contact-window logic for coach outreach.
 *
 * Drives the silent swap between the `intro-standard` and `intro-pre-window`
 * templates: before a coach is allowed to reply, the athlete only sees the
 * pre-window intro (which sets that expectation itself). The athlete never
 * learns the rule exists — the panel just shows one intro.
 *
 * Dates are NEVER hardcoded here. They live in the `contact_window_rules`
 * config table (they move yearly — verify at ncaa.org). This module only
 * computes an athlete-specific open date from a rule + their graduation year,
 * and decides pre-vs-open against "today".
 *
 * Grade-year convention (US): a `gradYear` athlete finishes grade 12 in the
 * spring of `gradYear`. Grade G academic year runs fall(startYear) →
 * spring(endYear) where endYear = gradYear - (12 - G), startYear = endYear - 1.
 */

export type ContactWindowState = "pre" | "open";

export interface ContactWindowRule {
  /** Lowercase sport name, or "*" for the division-wide default rule. */
  sport: string;
  /** "D1" | "D2" | "D3" | "NAIA" | "JUCO" */
  division: string;
  rule_kind: "date_before_grade" | "date_after_grade" | "unrestricted";
  /** Grade the window anchors to, e.g. "junior" | "sophomore". */
  reference?: string | null;
  /** Display date, e.g. "Aug 1". Parsed to month/day; year derived per athlete. */
  window_date?: string | null;
  notes?: string | null;
}

export interface ContactWindowInput {
  sport?: string | null;
  division?: string | null;
  gradYear?: number | null;
  today?: Date;
}

export interface ContactWindowResult {
  state: ContactWindowState;
  /** The date the coach may first reply; null when unrestricted/indeterminate. */
  opensOn: Date | null;
  /** The rule that decided this, or null when none matched (fail-open). */
  rule: ContactWindowRule | null;
}

const GRADE_BY_REFERENCE: Record<string, number> = {
  freshman: 9,
  sophomore: 10,
  junior: 11,
  senior: 12,
};

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Parse "Aug 1" / "Sept 15" -> { month: 0-11, day }. Returns null if unparseable. */
function parseWindowDate(
  raw: string | null | undefined,
): { month: number; day: number } | null {
  if (!raw) return null;
  const match = raw
    .trim()
    .toLowerCase()
    .match(/^([a-z]+)\.?\s+(\d{1,2})$/);
  if (!match) return null;
  const month = MONTHS[match[1]];
  const day = Number(match[2]);
  if (month === undefined || !day) return null;
  return { month, day };
}

/**
 * The calendar date a coach may first reply for this rule + athlete grad year.
 * `date_before_grade` anchors to the summer/fall right before the grade begins;
 * `date_after_grade` anchors to the calendar year that grade completes.
 * Returns null for unrestricted rules or unparseable config.
 */
export function computeWindowOpenDate(
  rule: ContactWindowRule,
  gradYear: number,
): Date | null {
  if (rule.rule_kind === "unrestricted") return null;

  const grade = GRADE_BY_REFERENCE[(rule.reference ?? "").toLowerCase()];
  const parsed = parseWindowDate(rule.window_date);
  if (!grade || !parsed) return null;

  const endYear = gradYear - (12 - grade); // spring the grade completes
  const year = rule.rule_kind === "date_before_grade" ? endYear - 1 : endYear;
  return new Date(year, parsed.month, parsed.day);
}

/** Pick the most specific rule: exact (sport, division), else ("*", division). */
function selectRule(
  rules: ContactWindowRule[],
  sport: string | null | undefined,
  division: string,
): ContactWindowRule | null {
  const sportKey = (sport ?? "").trim().toLowerCase();
  const forDivision = rules.filter((r) => r.division === division);
  return (
    forDivision.find(
      (r) => r.sport.toLowerCase() === sportKey && sportKey !== "",
    ) ??
    forDivision.find((r) => r.sport === "*") ??
    null
  );
}

/**
 * Decide whether the athlete is currently in the pre-contact window.
 * Fails OPEN (never hides the standard intro) when inputs are missing or no
 * rule matches — a missing rule should never gate outreach.
 */
export function evaluateContactWindow(
  rules: ContactWindowRule[],
  input: ContactWindowInput,
): ContactWindowResult {
  const today = input.today ?? new Date();
  const { division, gradYear, sport } = input;

  if (!division || !gradYear)
    return { state: "open", opensOn: null, rule: null };

  const rule = selectRule(rules, sport, division);
  if (!rule) return { state: "open", opensOn: null, rule: null };

  const opensOn = computeWindowOpenDate(rule, gradYear);
  if (!opensOn) return { state: "open", opensOn: null, rule };

  return { state: today < opensOn ? "pre" : "open", opensOn, rule };
}

interface WindowedTemplate {
  contact_window?: "pre" | "post" | "any" | null;
  type?: string | null;
  stage?: string | null;
}

/**
 * Show exactly the right intro variant for the current window. In the "open"
 * state, pre-window templates are hidden. In the "pre" state, an "any" template
 * is hidden when a "pre" sibling exists in the same (type, stage) group, so the
 * pre-window variant takes its place — the athlete sees a single intro either way.
 */
export function filterTemplatesByWindow<T extends WindowedTemplate>(
  templates: T[],
  state: ContactWindowState,
): T[] {
  if (state === "open") {
    return templates.filter((t) => t.contact_window !== "pre");
  }

  const groupsWithPre = new Set(
    templates
      .filter((t) => t.contact_window === "pre")
      .map((t) => `${t.type ?? ""}:${t.stage ?? ""}`),
  );

  return templates.filter((t) => {
    if (t.contact_window !== "any") return true;
    return !groupsWithPre.has(`${t.type ?? ""}:${t.stage ?? ""}`);
  });
}
