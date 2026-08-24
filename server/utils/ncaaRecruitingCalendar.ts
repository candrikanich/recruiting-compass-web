/**
 * Re-export of the NCAA recruiting calendar utility.
 *
 * The calendar/date logic is pure (no DB access, no secrets, no Nitro-only
 * APIs), so it lives client-safe under `~/utils`. Server code (e.g.
 * `ruleEngine.ts`, `scripts/seed-system-calendar.ts`) keeps importing from
 * this path so nothing server-side needs to change; this file just
 * re-exports the shared implementation.
 */
export * from "../../utils/ncaaRecruitingCalendar";
