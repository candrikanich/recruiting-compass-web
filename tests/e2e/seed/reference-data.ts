/**
 * Reference/support data the E2E suite depends on but which a from-scratch
 * Supabase project (or a per-run `reset.ts`) does not provide:
 *
 *  - player `user_preferences` (primary_sport=Baseball) — reset.ts wipes
 *    per-account prefs every run, so profile-edit specs need it re-seeded.
 *  - `nces_schools` sample — smart-inputs high-school search (e2e-* ids only,
 *    never real NCES data, so this is safe to seed into the test project).
 *  - `task.deadline_offset_months` — parent-tasks deadline badges. A fresh
 *    project seeds the task rows with NULL offsets; backfill by slug.
 *  - `cron_runs` health-ping history — admin Jobs card needs recent runs.
 *
 * Every write is idempotent (upsert / conditional insert / update-by-slug), so
 * running this on an already-populated project is a no-op.
 */

import type { getSupabaseAdmin } from "./helpers/supabase-admin";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

// The player test account's recruiting profile. Mirrors what the live test
// project held; primary_sport drives the profile-edit position buttons.
const PLAYER_PREFERENCES = {
  positions: ["Pitcher", "First Base"],
  core_courses: [] as string[],
  travel_teams: [] as string[],
  primary_sport: "Baseball",
  nces_school_id: "",
  graduation_year: 2028,
  cost_sensitivity: "medium",
  instagram_handle: "",
  primary_position: "Pitcher",
  travel_team_name: "",
  allow_share_email: false,
  allow_share_phone: false,
  travel_team_coach: "",
} as const;

// Test-only high schools (e2e-* ids). Multiple "Lincoln High School" rows are
// intentional — smart-inputs search must disambiguate by city/state.
const NCES_SAMPLE_SCHOOLS = [
  {
    nces_id: "e2e-nces-001",
    name: "Lincoln High School",
    city: "Portland",
    state: "OR",
    zip: "97203",
  },
  {
    nces_id: "e2e-nces-002",
    name: "Abraham Lincoln High School",
    city: "San Francisco",
    state: "CA",
    zip: "94132",
  },
  {
    nces_id: "e2e-nces-003",
    name: "Lincoln High School",
    city: "Seattle",
    state: "WA",
    zip: "98103",
  },
  {
    nces_id: "e2e-nces-004",
    name: "Lincoln High School",
    city: "Denver",
    state: "CO",
    zip: "80210",
  },
  {
    nces_id: "e2e-nces-005",
    name: "Lincolnway High School",
    city: "Frankfort",
    state: "IL",
    zip: "60423",
  },
  {
    nces_id: "e2e-nces-006",
    name: "Washington High School",
    city: "Portland",
    state: "OR",
    zip: "97205",
  },
  {
    nces_id: "e2e-nces-007",
    name: "Roosevelt High School",
    city: "Seattle",
    state: "WA",
    zip: "98105",
  },
  {
    nces_id: "e2e-nces-008",
    name: "Jefferson High School",
    city: "Portland",
    state: "OR",
    zip: "97217",
  },
] as const;

// Deadline offsets (months from the plan anchor) grouped by offset value.
// A fresh project seeds tasks with NULL offsets; this backfills them.
// Grouped so we can batch-update per offset (4 queries instead of 77).
const TASK_DEADLINE_OFFSETS_BY_MONTHS: Record<number, string[]> = {
  6: [
    "attend-final-recruiting-camps-showcases",
    "attend-official-visits",
    "celebrate-the-journey",
    "communicate-decision-to-other-coaches",
    "complete-college-applications",
    "finalize-medical-information",
    "finalize-player-video-for-college",
    "finalize-test-scores",
    "maintain-professional-social-media-through-commitment",
    "maintain-strong-grades-college-ready",
    "make-final-school-decision",
    "manage-multiple-offers-if-applicable",
    "peak-senior-year-performance",
    "prepare-for-college-transition",
    "sign-nli",
    "submit-final-highlight-video",
  ],
  18: [
    "attend-recruiting-camps-at-target-schools",
    "build-media-presence-highlights-online",
    "build-relationship-with-preferred-coaches",
    "develop-resilience-for-rejection",
    "document-and-share-performance-data",
    "evaluate-interest-level-from-coaches",
    "evaluate-school-fit-beyond-baseball",
    "film-multiple-game-performances",
    "get-evaluated-by-outside-scouts",
    "get-updated-athletic-testing-11",
    "increase-coach-communication",
    "maintain-gpa-3-0-target",
    "meet-with-college-counselor",
    "peak-athletic-performance-11",
    "pitch-your-strengths",
    "play-in-national-showcases",
    "prepare-for-offer-conversations",
    "register-with-naia-eligibility-center",
    "register-with-ncaa-eligibility",
    "schedule-unofficial-visits",
    "send-junior-year-highlight-video-update",
    "take-official-sat-or-act",
    "take-sat-or-act-again-if-needed",
  ],
  30: [
    "attend-premium-summer-tournaments",
    "attend-summer-camps-multiple",
    "build-target-school-list-20",
    "continue-development-training",
    "create-highlight-video",
    "film-responses-to-coach-requests",
    "get-updated-athletic-testing-10",
    "handle-recruiting-pressure",
    "maintain-strong-gpa-10",
    "participate-in-recruiting-events",
    "research-coach-information",
    "research-college-academics",
    "send-first-introductory-emails",
    "specialize-position-focus",
    "stay-grounded-and-humble",
    "take-psat-again",
    "take-sat-or-act-prep-course",
    "understand-recruiting-evaluation-process",
    "update-athletic-resume",
    "update-social-media-with-highlight-content",
  ],
  42: [
    "attend-summer-camps-optional-but-beneficial",
    "create-basic-athletic-resume",
    "create-social-media-presence",
    "document-stats-and-achievements",
    "establish-communication-with-parents",
    "establish-development-routine",
    "get-athletic-testing-baseline",
    "meet-with-academic-counselor",
    "play-travel-ball",
    "research-division-levels",
    "research-showcases-for-summer",
    "set-recruiting-goals",
    "start-building-target-school-list",
    "start-game-film-collection",
    "take-psat-or-practice-tests",
    "track-gpa-and-grades",
    "understand-academic-requirements",
    "understand-recruiting-reality",
  ],
};

async function seedPlayerPreferences(
  supabase: SupabaseAdmin,
  playerUserId: string,
): Promise<void> {
  // The app reads/writes player details under category "player_details" (see
  // server/api/user/preferences/player-details.patch.ts). Seeding the legacy
  // "player" category left form.primary_sport empty, so the profile-edit
  // Athletics tab rendered no position buttons.
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: playerUserId,
      category: "player_details",
      data: PLAYER_PREFERENCES,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category" },
  );
  if (error) throw error;
  console.log(
    "✅ Seeded player user_preferences (player_details, primary_sport=Baseball)",
  );
}

async function seedNcesSampleSchools(supabase: SupabaseAdmin): Promise<void> {
  const { error } = await supabase
    .from("nces_schools")
    .upsert([...NCES_SAMPLE_SCHOOLS], { onConflict: "nces_id" });
  if (error) throw error;
  console.log(`✅ Seeded ${NCES_SAMPLE_SCHOOLS.length} nces_schools samples`);
}

async function seedTaskDeadlineOffsets(supabase: SupabaseAdmin): Promise<void> {
  const entries = Object.entries(TASK_DEADLINE_OFFSETS_BY_MONTHS);
  const results = await Promise.all(
    entries.map(([months, slugs]) =>
      supabase
        .from("task")
        .update({ deadline_offset_months: Number(months) })
        .in("slug", slugs),
    ),
  );
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    throw failed[0].error;
  }
  const totalSlugs = entries.reduce((sum, [, slugs]) => sum + slugs.length, 0);
  console.log(
    `✅ Backfilled deadline_offset_months on ${totalSlugs} task slugs (${entries.length} batched updates)`,
  );
}

async function seedCronRunSamples(supabase: SupabaseAdmin): Promise<void> {
  const { count } = await supabase
    .from("cron_runs")
    .select("id", { count: "exact", head: true })
    .eq("job_name", "health-ping");
  if ((count ?? 0) > 0) {
    console.log("⏭️  cron_runs already has health-ping history — skipping");
    return;
  }

  const now = Date.now();
  const rows = Array.from({ length: 5 }, (_, i) => {
    const started = new Date(now - (i + 1) * 24 * 60 * 60 * 1000);
    const finished = new Date(started.getTime() + 800);
    return {
      job_name: "health-ping",
      status: "success",
      started_at: started.toISOString(),
      finished_at: finished.toISOString(),
      duration_ms: 800,
      rows_processed: 10,
      rows_failed: 0,
    };
  });

  const { error } = await supabase.from("cron_runs").insert(rows);
  if (error) throw error;
  console.log(`✅ Seeded ${rows.length} health-ping cron_runs samples`);
}

/**
 * Seeds all reference/support data. Safe to call on an already-populated
 * project — every write is idempotent.
 */
export async function seedReferenceData(
  supabase: SupabaseAdmin,
  playerUserId: string,
): Promise<void> {
  console.log("📚 Seeding reference data...");
  await seedPlayerPreferences(supabase, playerUserId);
  await seedNcesSampleSchools(supabase);
  await seedTaskDeadlineOffsets(supabase);
  await seedCronRunSamples(supabase);
}
