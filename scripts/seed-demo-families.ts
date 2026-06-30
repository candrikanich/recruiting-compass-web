/**
 * Seed two shareable demo family units (parent + player each) with realistic
 * sample data, for handing to outside testers.
 *
 * These accounts are DELIBERATELY NOT in tests/e2e/config/test-accounts.ts and
 * use a non-"test" email domain so they survive the E2E reset/seed machinery:
 *   - sql/001-reset-tables.sql deletes auth.users LIKE '%@test.com' / '%test%'
 *   - reset.ts only deletes emails listed in TEST_ACCOUNTS
 *   - seed.ts (db:seed:test) globally truncates the schools table — NEVER run
 *     that against this data; this standalone script is the only seeder for it.
 *
 * Run: npx tsx scripts/seed-demo-families.ts
 * Requires Node 22+ (native WebSocket) and SUPABASE_SERVICE_ROLE_KEY +
 * NUXT_PUBLIC_SUPABASE_URL in .env / .env.local.
 */
import { config } from "dotenv";
import { resolve } from "path";
import {
  getSupabaseAdmin,
  createOneOffTestUser,
} from "../tests/e2e/seed/helpers/supabase-admin";
import { calculateCurrentGrade } from "../utils/gradeHelpers";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") }); // .env.local overrides

const SHARED_PASSWORD = "DemoPass123!";
const DAY = 24 * 60 * 60 * 1000;
const daysAgoISO = (n: number) => new Date(Date.now() - n * DAY).toISOString();

type Supabase = ReturnType<typeof getSupabaseAdmin>;

interface DemoSchool {
  name: string;
  city: string;
  state: string;
  division: "D1" | "D2" | "D3" | "NAIA" | "JUCO";
  conference: string;
  status: string;
  is_favorite?: boolean;
  coach: { first_name: string; last_name: string; role: "head" | "recruiting" | "assistant" };
  interactions: Array<{
    type: string;
    direction: "outbound" | "inbound";
    sentiment: "very_positive" | "positive" | "neutral" | "negative";
    subject: string;
    content: string;
    daysAgo: number;
  }>;
}

interface DemoFamily {
  label: string;
  familyName: string;
  player: {
    email: string;
    displayName: string;
    sport: string;
    position: string;
    graduationYear: number;
    gpa: number;
    satScore: number;
    state: string;
    zip: string;
  };
  parent: { email: string; displayName: string };
  schools: DemoSchool[];
}

const FAMILIES: DemoFamily[] = [
  {
    label: "Family A — Carter (Soccer)",
    familyName: "Carter Family",
    player: {
      email: "player1@compassdemo.app",
      displayName: "Jordan Carter",
      sport: "Soccer",
      position: "Center Midfielder",
      graduationYear: 2027,
      gpa: 3.8,
      satScore: 1290,
      state: "NC",
      zip: "27701",
    },
    parent: { email: "parent1@compassdemo.app", displayName: "Alicia Carter" },
    schools: [
      {
        name: "Duke University", city: "Durham", state: "NC", division: "D1",
        conference: "ACC", status: "interested", is_favorite: true,
        coach: { first_name: "Mark", last_name: "Reyes", role: "recruiting" },
        interactions: [
          { type: "email", direction: "inbound", sentiment: "very_positive", subject: "Loved your highlight reel", content: "Coach Reyes reached out after the fall showcase — wants to stay in touch.", daysAgo: 4 },
          { type: "camp", direction: "outbound", sentiment: "positive", subject: "Registered for ID camp", content: "Signed up for the December ID camp on campus.", daysAgo: 12 },
        ],
      },
      {
        name: "Wake Forest University", city: "Winston-Salem", state: "NC", division: "D1",
        conference: "ACC", status: "contacted",
        coach: { first_name: "Dana", last_name: "Whitfield", role: "head" },
        interactions: [
          { type: "phone_call", direction: "inbound", sentiment: "positive", subject: "Intro call", content: "15-min call with the head coach about academics and fit.", daysAgo: 9 },
        ],
      },
      {
        name: "Elon University", city: "Elon", state: "NC", division: "D1",
        conference: "CAA", status: "researching",
        coach: { first_name: "Sam", last_name: "Okafor", role: "assistant" },
        interactions: [
          { type: "email", direction: "outbound", sentiment: "neutral", subject: "Intro + transcript", content: "Sent intro email with transcript and season schedule.", daysAgo: 20 },
        ],
      },
      {
        name: "Davidson College", city: "Davidson", state: "NC", division: "D1",
        conference: "A-10", status: "researching",
        coach: { first_name: "Priya", last_name: "Nadeem", role: "recruiting" },
        interactions: [
          { type: "showcase", direction: "outbound", sentiment: "positive", subject: "Saw them at regionals", content: "Watched Davidson staff at the regional showcase; strong academic match.", daysAgo: 27 },
        ],
      },
    ],
  },
  {
    label: "Family B — Bennett (Baseball)",
    familyName: "Bennett Family",
    player: {
      email: "player2@compassdemo.app",
      displayName: "Taylor Bennett",
      sport: "Baseball",
      position: "Center Field",
      graduationYear: 2028,
      gpa: 3.5,
      satScore: 1180,
      state: "OH",
      zip: "43004",
    },
    parent: { email: "parent2@compassdemo.app", displayName: "Marcus Bennett" },
    schools: [
      {
        name: "Xavier University", city: "Cincinnati", state: "OH", division: "D1",
        conference: "Big East", status: "offer_received", is_favorite: true,
        coach: { first_name: "Leon", last_name: "Pratt", role: "head" },
        interactions: [
          { type: "official_visit", direction: "inbound", sentiment: "very_positive", subject: "Official visit invite", content: "Invited for an official visit the weekend after Thanksgiving.", daysAgo: 3 },
          { type: "phone_call", direction: "inbound", sentiment: "very_positive", subject: "Scholarship conversation", content: "Head coach discussed a partial scholarship offer.", daysAgo: 6 },
        ],
      },
      {
        name: "University of Dayton", city: "Dayton", state: "OH", division: "D1",
        conference: "A-10", status: "interested",
        coach: { first_name: "Gabe", last_name: "Sorensen", role: "recruiting" },
        interactions: [
          { type: "in_person_visit", direction: "outbound", sentiment: "positive", subject: "Unofficial visit", content: "Toured campus and met two assistants after a home game.", daysAgo: 11 },
        ],
      },
      {
        name: "Miami University (Ohio)", city: "Oxford", state: "OH", division: "D1",
        conference: "MAC", status: "contacted",
        coach: { first_name: "Iris", last_name: "Hollin", role: "assistant" },
        interactions: [
          { type: "dm", direction: "inbound", sentiment: "positive", subject: "Twitter DM", content: "Assistant slid into DMs after a walk-off win at the summer tournament.", daysAgo: 15 },
        ],
      },
      {
        name: "Cleveland State University", city: "Cleveland", state: "OH", division: "D1",
        conference: "Horizon", status: "researching",
        coach: { first_name: "Ray", last_name: "Demarco", role: "recruiting" },
        interactions: [
          { type: "email", direction: "outbound", sentiment: "neutral", subject: "Intro email", content: "Sent intro with stats and film link.", daysAgo: 22 },
        ],
      },
    ],
  },
];

async function resolveSportAndPosition(
  supabase: Supabase,
  sportName: string,
  positionName: string,
): Promise<{ sportId: string; positionId: string }> {
  const { data: sport, error: sportErr } = await supabase
    .from("sports").select("id").eq("name", sportName).maybeSingle();
  if (sportErr || !sport) throw new Error(`sport not found: ${sportName} (${sportErr?.message ?? ""})`);
  const sportId = (sport as { id: string }).id;

  const { data: pos, error: posErr } = await supabase
    .from("positions").select("id").eq("sport_id", sportId).eq("name", positionName).maybeSingle();
  if (posErr || !pos) throw new Error(`position not found: ${positionName} for ${sportName}`);
  return { sportId, positionId: (pos as { id: string }).id };
}

/** Remove previously-seeded demo content for this player so re-runs stay clean. */
async function resetPlayerContent(supabase: Supabase, playerId: string): Promise<void> {
  const { data: schools } = await supabase
    .from("schools").select("id").eq("user_id", playerId);
  const schoolIds = (schools ?? []).map((s) => (s as { id: string }).id);
  if (schoolIds.length > 0) {
    await supabase.from("interactions").delete().in("school_id", schoolIds);
    await supabase.from("coaches").delete().in("school_id", schoolIds);
    await supabase.from("schools").delete().in("id", schoolIds);
  }
  await supabase.from("athlete_task").delete().eq("athlete_id", playerId);
}

async function ensureFamilyUnit(
  supabase: Supabase,
  playerId: string,
  familyName: string,
): Promise<string> {
  const { data: membership } = await supabase
    .from("family_members").select("family_unit_id").eq("user_id", playerId).maybeSingle();
  if (membership) return (membership as { family_unit_id: string }).family_unit_id;

  const { data: unit, error } = await supabase
    .from("family_units")
    .insert({ family_name: familyName, created_by_user_id: playerId })
    .select("id").single();
  if (error || !unit) throw new Error(`family_units insert failed: ${error?.message}`);
  return (unit as { id: string }).id;
}

async function ensureMember(
  supabase: Supabase,
  familyUnitId: string,
  userId: string,
  role: "player" | "parent",
): Promise<void> {
  const { data: existing } = await supabase
    .from("family_members").select("id")
    .eq("family_unit_id", familyUnitId).eq("user_id", userId).maybeSingle();
  if (existing) return;
  const { error } = await supabase
    .from("family_members").insert({ family_unit_id: familyUnitId, user_id: userId, role });
  if (error) throw new Error(`family_members insert (${role}) failed: ${error.message}`);
}

async function seedSchools(
  supabase: Supabase,
  familyUnitId: string,
  playerId: string,
  schools: DemoSchool[],
): Promise<void> {
  for (const school of schools) {
    const { data: row, error: schoolErr } = await supabase
      .from("schools")
      .insert({
        name: school.name, user_id: playerId, family_unit_id: familyUnitId,
        status: school.status, division: school.division, conference: school.conference,
        city: school.city, state: school.state, location: `${school.city}, ${school.state}`,
        is_favorite: school.is_favorite ?? false,
      })
      .select("id").single();
    if (schoolErr || !row) throw new Error(`schools insert (${school.name}) failed: ${schoolErr?.message}`);
    const schoolId = (row as { id: string }).id;

    const { data: coachRow, error: coachErr } = await supabase
      .from("coaches")
      .insert({
        school_id: schoolId, user_id: playerId, family_unit_id: familyUnitId,
        first_name: school.coach.first_name, last_name: school.coach.last_name,
        role: school.coach.role,
        last_contact_date: daysAgoISO(school.interactions[0]?.daysAgo ?? 7),
      })
      .select("id").single();
    if (coachErr) throw new Error(`coaches insert (${school.name}) failed: ${coachErr.message}`);
    const coachId = coachRow ? (coachRow as { id: string }).id : null;

    const interactionRows = school.interactions.map((i) => ({
      school_id: schoolId, coach_id: coachId, family_unit_id: familyUnitId, logged_by: playerId,
      type: i.type, direction: i.direction, sentiment: i.sentiment,
      subject: i.subject, content: i.content, occurred_at: daysAgoISO(i.daysAgo),
    }));
    const { error: intErr } = await supabase.from("interactions").insert(interactionRows);
    if (intErr) throw new Error(`interactions insert (${school.name}) failed: ${intErr.message}`);
  }
}

async function seedCompletedTasks(
  supabase: Supabase,
  playerId: string,
  graduationYear: number,
): Promise<number> {
  const grade = calculateCurrentGrade(graduationYear);
  const { data: tasks } = await supabase
    .from("task").select("id").eq("grade_level", grade).limit(6);
  const ids = (tasks ?? []).map((t) => (t as { id: string }).id);
  if (ids.length === 0) return 0;

  // Mark the first ~40% complete; the rest stay open in the UI.
  const completeCount = Math.max(1, Math.floor(ids.length * 0.4));
  const rows = ids.slice(0, completeCount).map((taskId) => ({
    athlete_id: playerId, task_id: taskId,
    status: "completed", completed_at: daysAgoISO(5),
  }));
  const { error } = await supabase
    .from("athlete_task").upsert(rows, { onConflict: "athlete_id,task_id" });
  if (error) throw new Error(`athlete_task upsert failed: ${error.message}`);
  return rows.length;
}

async function seedFamily(supabase: Supabase, family: DemoFamily): Promise<void> {
  console.log(`\n🏠 ${family.label}`);

  const playerUser = await createOneOffTestUser({
    email: family.player.email, password: SHARED_PASSWORD,
    displayName: family.player.displayName, role: "player",
  });
  const parentUser = await createOneOffTestUser({
    email: family.parent.email, password: SHARED_PASSWORD,
    displayName: family.parent.displayName, role: "parent",
  });
  console.log(`   👤 player ${family.player.email} / parent ${family.parent.email}`);

  const playerId = playerUser.id;
  const parentId = parentUser.id;
  if (!playerId || !parentId) throw new Error("auth user missing id after create");

  const { sportId, positionId } = await resolveSportAndPosition(
    supabase, family.player.sport, family.player.position,
  );

  // Admin createUser does NOT populate public.users on this project (the mirror
  // trigger only fires on app-side signup), so upsert the row ourselves.
  const onboarded = { onboarding_complete: true, onboarding_completed_at: new Date().toISOString() };
  const { error: playerUpdErr } = await supabase.from("users").upsert({
    id: playerId, email: family.player.email,
    role: "player", full_name: family.player.displayName,
    graduation_year: family.player.graduationYear,
    primary_sport_id: sportId, primary_position_id: positionId,
    gpa: family.player.gpa, sat_score: family.player.satScore,
    zip_code: family.player.zip, onboarding_completed: true,
    phase_milestone_data: onboarded,
  }, { onConflict: "id" });
  if (playerUpdErr) throw new Error(`users upsert (player) failed: ${playerUpdErr.message}`);

  const { error: parentUpdErr } = await supabase.from("users").upsert({
    id: parentId, email: family.parent.email,
    role: "parent", full_name: family.parent.displayName, onboarding_completed: true,
    phase_milestone_data: onboarded,
  }, { onConflict: "id" });
  if (parentUpdErr) throw new Error(`users upsert (parent) failed: ${parentUpdErr.message}`);

  const familyUnitId = await ensureFamilyUnit(supabase, playerId, family.familyName);
  await ensureMember(supabase, familyUnitId, playerId, "player");
  await ensureMember(supabase, familyUnitId, parentId, "parent");
  console.log(`   🔗 linked into family_unit ${familyUnitId}`);

  await resetPlayerContent(supabase, playerId);
  await seedSchools(supabase, familyUnitId, playerId, family.schools);
  const taskCount = await seedCompletedTasks(supabase, playerId, family.player.graduationYear);
  console.log(`   🎓 ${family.schools.length} schools + coaches + interactions, ${taskCount} tasks completed`);
}

async function main(): Promise<void> {
  const supabase = getSupabaseAdmin();
  console.log(`Seeding ${FAMILIES.length} demo families → ${process.env.NUXT_PUBLIC_SUPABASE_URL}`);
  for (const family of FAMILIES) {
    await seedFamily(supabase, family);
  }
  console.log(`\n✅ Done. Shared password for all demo accounts: ${SHARED_PASSWORD}`);
}

main().catch((err) => {
  console.error("\n❌ Demo seed failed:", err);
  process.exit(1);
});
