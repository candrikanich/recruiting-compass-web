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
  { nces_id: "e2e-nces-001", name: "Lincoln High School", city: "Portland", state: "OR", zip: "97203" },
  { nces_id: "e2e-nces-002", name: "Abraham Lincoln High School", city: "San Francisco", state: "CA", zip: "94132" },
  { nces_id: "e2e-nces-003", name: "Lincoln High School", city: "Seattle", state: "WA", zip: "98103" },
  { nces_id: "e2e-nces-004", name: "Lincoln High School", city: "Denver", state: "CO", zip: "80210" },
  { nces_id: "e2e-nces-005", name: "Lincolnway High School", city: "Frankfort", state: "IL", zip: "60423" },
  { nces_id: "e2e-nces-006", name: "Washington High School", city: "Portland", state: "OR", zip: "97205" },
  { nces_id: "e2e-nces-007", name: "Roosevelt High School", city: "Seattle", state: "WA", zip: "98105" },
  { nces_id: "e2e-nces-008", name: "Jefferson High School", city: "Portland", state: "OR", zip: "97217" },
] as const;

// Deadline offsets (months from the plan anchor) keyed by task slug — the
// values production carries. A fresh project seeds tasks with NULL offsets.
const TASK_DEADLINE_OFFSETS: Record<string, number> = {
  "attend-final-recruiting-camps-showcases": 6,
  "attend-official-visits": 6,
  "attend-premium-summer-tournaments": 30,
  "attend-recruiting-camps-at-target-schools": 18,
  "attend-summer-camps-multiple": 30,
  "attend-summer-camps-optional-but-beneficial": 42,
  "build-media-presence-highlights-online": 18,
  "build-relationship-with-preferred-coaches": 18,
  "build-target-school-list-20": 30,
  "celebrate-the-journey": 6,
  "communicate-decision-to-other-coaches": 6,
  "complete-college-applications": 6,
  "continue-development-training": 30,
  "create-basic-athletic-resume": 42,
  "create-highlight-video": 30,
  "create-social-media-presence": 42,
  "develop-resilience-for-rejection": 18,
  "document-and-share-performance-data": 18,
  "document-stats-and-achievements": 42,
  "establish-communication-with-parents": 42,
  "establish-development-routine": 42,
  "evaluate-interest-level-from-coaches": 18,
  "evaluate-school-fit-beyond-baseball": 18,
  "film-multiple-game-performances": 18,
  "film-responses-to-coach-requests": 30,
  "finalize-medical-information": 6,
  "finalize-player-video-for-college": 6,
  "finalize-test-scores": 6,
  "get-athletic-testing-baseline": 42,
  "get-evaluated-by-outside-scouts": 18,
  "get-updated-athletic-testing-10": 30,
  "get-updated-athletic-testing-11": 18,
  "handle-recruiting-pressure": 30,
  "increase-coach-communication": 18,
  "maintain-gpa-3-0-target": 18,
  "maintain-professional-social-media-through-commitment": 6,
  "maintain-strong-gpa-10": 30,
  "maintain-strong-grades-college-ready": 6,
  "make-final-school-decision": 6,
  "manage-multiple-offers-if-applicable": 6,
  "meet-with-academic-counselor": 42,
  "meet-with-college-counselor": 18,
  "participate-in-recruiting-events": 30,
  "peak-athletic-performance-11": 18,
  "peak-senior-year-performance": 6,
  "pitch-your-strengths": 18,
  "play-in-national-showcases": 18,
  "play-travel-ball": 42,
  "prepare-for-college-transition": 6,
  "prepare-for-offer-conversations": 18,
  "register-with-naia-eligibility-center": 18,
  "register-with-ncaa-eligibility": 18,
  "research-coach-information": 30,
  "research-college-academics": 30,
  "research-division-levels": 42,
  "research-showcases-for-summer": 42,
  "schedule-unofficial-visits": 18,
  "send-first-introductory-emails": 30,
  "send-junior-year-highlight-video-update": 18,
  "set-recruiting-goals": 42,
  "sign-nli": 6,
  "specialize-position-focus": 30,
  "start-building-target-school-list": 42,
  "start-game-film-collection": 42,
  "stay-grounded-and-humble": 30,
  "submit-final-highlight-video": 6,
  "take-official-sat-or-act": 18,
  "take-psat-again": 30,
  "take-psat-or-practice-tests": 42,
  "take-sat-or-act-again-if-needed": 18,
  "take-sat-or-act-prep-course": 30,
  "track-gpa-and-grades": 42,
  "understand-academic-requirements": 42,
  "understand-recruiting-evaluation-process": 30,
  "understand-recruiting-reality": 42,
  "update-athletic-resume": 30,
  "update-social-media-with-highlight-content": 30,
};

async function seedPlayerPreferences(
  supabase: SupabaseAdmin,
  playerUserId: string,
): Promise<void> {
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: playerUserId,
      category: "player",
      data: PLAYER_PREFERENCES,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category" },
  );
  if (error) throw error;
  console.log("✅ Seeded player user_preferences (primary_sport=Baseball)");
}

async function seedNcesSampleSchools(supabase: SupabaseAdmin): Promise<void> {
  const { error } = await supabase
    .from("nces_schools")
    .upsert([...NCES_SAMPLE_SCHOOLS], { onConflict: "nces_id" });
  if (error) throw error;
  console.log(`✅ Seeded ${NCES_SAMPLE_SCHOOLS.length} nces_schools samples`);
}

async function seedTaskDeadlineOffsets(supabase: SupabaseAdmin): Promise<void> {
  const updates = Object.entries(TASK_DEADLINE_OFFSETS).map(([slug, months]) =>
    supabase
      .from("task")
      .update({ deadline_offset_months: months })
      .eq("slug", slug),
  );
  const results = await Promise.all(updates);
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    throw failed[0].error;
  }
  console.log(
    `✅ Backfilled deadline_offset_months on ${updates.length} task slugs`,
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
