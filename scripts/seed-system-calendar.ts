// Run with: npx tsx scripts/seed-system-calendar.ts
//
// TODO(sport-aware-calendar): `system_calendar` is not queried anywhere in
// app code (grepped 2026-08-23 — only this script writes to it; the table
// exists from migration 20260318000001 but has no reader). This script is
// effectively orphaned. It previously seeded ONLY baseball's D1 periods
// (hardcoded `sport: "baseball"`), so this rewire preserves that exact
// scope — pulling from the new sport-aware module's `D1_CALENDARS.MBA`
// (baseball's D1 calendar) instead of the removed `RECRUITING_CALENDAR_2026`
// constant — rather than inventing a new all-sports seeding scheme. If a
// future task wires a reader for `system_calendar`, revisit whether it
// should seed every sport's D1 calendar (`D1_CALENDARS`) instead.
import { createClient } from "@supabase/supabase-js";
import { ALL_MILESTONES } from "../server/utils/ncaaRecruitingCalendar";
import { D1_CALENDARS } from "../utils/recruitingCalendar";

const supabase = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Map RecruitingPeriod.type → system_calendar category
function periodCategory(type: string): string {
  const map: Record<string, string> = {
    dead: "dead_period",
    // recruiting_shutdown is the stricter dead-period variant (no calls/
    // texts/correspondence either) — buckets with "dead" here, same as
    // ruleEngine's contact-gating treats them as equally blocking.
    recruiting_shutdown: "dead_period",
    quiet: "quiet_period",
    contact: "contact_period",
    evaluation: "evaluation_period",
  };
  return map[type] ?? "contact_period";
}

// Map Milestone.type → system_calendar category
function milestoneCategory(m: { type: string; title: string }): string {
  if (m.type === "test") {
    return m.title.toLowerCase().includes("sat") ? "sat_date" : "act_date";
  }
  if (m.type === "signing") return "signing_day";
  // ncaa-period, deadline, application → nli_period (closest generic bucket)
  return "nli_period";
}

// Normalize division strings to DB-allowed values: 'd1' | 'd2' | 'd3' | null
function normalizeDivision(div: string | undefined | null): string | null {
  if (!div) return null;
  const map: Record<string, string> = {
    D1: "d1",
    DI: "d1",
    D2: "d2",
    DII: "d2",
    D3: "d3",
    DIII: "d3",
  };
  return map[div] ?? null; // ALL, NAIA, JUCO → null
}

// Baseball's D1 calendar only — matches this script's pre-existing scope
// (see TODO above). Periods carry no per-period division in the new module
// (division is a property of which calendar you resolved, not the period
// itself) — MBA is D1-only, so it's hardcoded here same as before.
const periodRows = D1_CALENDARS.MBA.periods.map((p) => ({
  category: periodCategory(p.type),
  sport: "baseball",
  division: normalizeDivision("D1"),
  label: p.description,
  start_date: p.start,
  end_date: p.end,
  season_year: 2026,
}));

const milestoneRows = ALL_MILESTONES.map((m) => ({
  category: milestoneCategory(m),
  sport: null,
  division: normalizeDivision(m.division as string | undefined),
  label: m.title,
  start_date: m.date,
  end_date: null,
  season_year: 2026,
}));

const rows = [...periodRows, ...milestoneRows];
console.log(`Seeding ${rows.length} system_calendar rows...`);

const { error } = await supabase
  .from("system_calendar")
  .upsert(rows, { onConflict: "label,start_date,season_year" });

if (error) {
  console.error("Seed failed:", error);
  process.exit(1);
}
console.log(`Seeded ${rows.length} rows successfully.`);
