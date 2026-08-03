/**
 * Local-date utilities for date-only (`YYYY-MM-DD`) values.
 *
 * `new Date("2027-12-01")` parses a date-only ISO string as **UTC midnight**
 * per the ECMAScript spec. In any timezone behind UTC (every US timezone),
 * that instant falls on the *previous* local evening — so deadlines, offer
 * expirations, reminders, and event dates all display/compare one calendar
 * day early. Deriving "today" from `toISOString().split("T")[0]` has the
 * same problem in reverse: it drifts to tomorrow after ~5-8pm local time.
 *
 * These helpers always work in LOCAL date parts. Only use them for
 * date-only values (DB `date` columns, `<input type="date">`) — full
 * timestamps (`timestamptz`, `occurred_at`, `created_at`, ISO strings with
 * an explicit time + offset) parse correctly with plain `new Date(...)`
 * and must not be routed through here.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_ONLY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Parse a date-only string (`YYYY-MM-DD`, optionally with a trailing time
 * component that is ignored) into a `Date` at LOCAL midnight.
 */
export function parseLocalDateOnly(dateOnlyString: string): Date {
  const match = DATE_ONLY_PREFIX.exec(dateOnlyString);
  if (!match) {
    throw new Error(`Invalid date-only string: "${dateOnlyString}"`);
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** Format a local `Date` back to a date-only `YYYY-MM-DD` string. */
export function formatLocalDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "Today" as a `Date` at local midnight, derived from local date parts. */
export function getLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** True if `date` falls on the same LOCAL calendar day as `reference` (defaults to now). */
export function isSameLocalDay(
  date: Date,
  reference: Date = new Date(),
): boolean {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

/**
 * Compare two date-only strings at day granularity.
 * Returns <0 if `a` is earlier, 0 if same day, >0 if `a` is later.
 */
export function compareDateOnlyStrings(a: string, b: string): number {
  const dateA = parseLocalDateOnly(a);
  const dateB = parseLocalDateOnly(b);
  return dateA.getTime() - dateB.getTime();
}

/** Whole local days between two date-only strings (`b` minus `a`). */
export function daysBetweenDateOnlyStrings(a: string, b: string): number {
  return Math.round(compareDateOnlyStrings(a, b) / MS_PER_DAY);
}

/**
 * Local midnight of the day AFTER `dateOnlyString` — use as an EXCLUSIVE
 * upper bound in range filters (`< bound`) instead of `<= endDate T00:00Z`,
 * which silently excludes the entire end day.
 */
export function exclusiveEndOfDay(dateOnlyString: string): Date {
  const date = parseLocalDateOnly(dateOnlyString);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/** Date-only string for the day AFTER `dateOnlyString` (exclusive upper bound as `YYYY-MM-DD`). */
export function exclusiveEndOfDayString(dateOnlyString: string): string {
  return formatLocalDateOnly(exclusiveEndOfDay(dateOnlyString));
}
