import { getSupabaseAdmin, createTestAccounts } from "./helpers/supabase-admin";
import { seedReferenceData } from "./reference-data";

const SEED_DATA = {
  schools: [
    {
      name: "Duke University",
      location: "Durham, NC",
      division: "D1",
      conference: "ACC",
      status: "researching",
      coaching_style: "High-intensity, player development focused",
      recruiting_approach: "Early recruiting, All-around athletes",
    },
    {
      name: "Boston College",
      location: "Boston, MA",
      division: "D1",
      conference: "ACC",
      status: "contacted",
      coaching_style: "Team-first, defensive emphasis",
      recruiting_approach: "Late bloomers welcome",
    },
    {
      name: "University of Florida",
      location: "Gainesville, FL",
      division: "D1",
      conference: "SEC",
      status: "researching",
      coaching_style: "Aggressive recruiting",
      recruiting_approach: "Top-tier athletes only",
    },
    {
      name: "Vanderbilt University",
      location: "Nashville, TN",
      division: "D1",
      conference: "SEC",
      status: "contacted",
      coaching_style: "Academics balanced with athletics",
      recruiting_approach: "Holistic evaluation",
    },
    {
      name: "University of Arizona",
      location: "Tucson, AZ",
      division: "D1",
      conference: "Pac-12",
      status: "contacted",
      coaching_style: "Traditional, proven approach",
      recruiting_approach: "Similar position profiles",
    },
  ],
  coaches: [
    {
      first_name: "John",
      last_name: "Smith",
      role: "head",
      email: "jsmith@duke.edu",
    },
    {
      first_name: "Mike",
      last_name: "Johnson",
      role: "recruiting",
      email: "mjohnson@duke.edu",
    },
    {
      first_name: "Sarah",
      last_name: "Williams",
      role: "head",
      email: "swilliams@bc.edu",
    },
    {
      first_name: "Tom",
      last_name: "Brown",
      role: "assistant",
      email: "tbrown@bc.edu",
    },
    {
      first_name: "David",
      last_name: "Martinez",
      role: "head",
      email: "dmartinez@ufl.edu",
    },
  ],
};

async function seedDatabase() {
  console.log("🌱 Seeding test database...");

  const supabase = getSupabaseAdmin();

  try {
    // Step 1: Create test accounts (also ensures the player's family_unit +
    // family_members rows exist — see createTestAccounts).
    console.log("👤 Creating test accounts...");
    await createTestAccounts();

    // Resolve player user ID (required by schools.user_id NOT NULL constraint)
    const { data: listData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const playerUser = listData?.users?.find(
      (u) => u.email === "player@test.com",
    );
    if (!playerUser) {
      throw new Error(
        "player@test.com not found — cannot seed schools without user_id",
      );
    }
    const playerUserId = playerUser.id;

    // Resolve the player's family_unit_id. The service-role client bypasses
    // RLS, but the app's RLS on schools is family-model-only (Phase 10a) —
    // rows seeded without family_unit_id are invisible to the signed-in test
    // user, so seeding without it produces data the tests can't see.
    const { data: membership, error: membershipError } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", playerUserId)
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership) {
      throw new Error(
        "player@test.com has no family_members row — cannot seed schools without family_unit_id",
      );
    }
    const familyUnitId = membership.family_unit_id as string;

    // Step 2: Clear this test account's previous seed data only. This DB is
    // shared with real users — never issue unscoped deletes here.
    console.log("📦 Clearing previous test-account seed data...");
    await supabase.from("coaches").delete().eq("user_id", playerUserId);
    await supabase.from("schools").delete().eq("user_id", playerUserId);
    console.log("✅ Cleared previous test-account seed data");

    // Step 3: Seed schools
    console.log("🏫 Seeding schools...");
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .insert(
        SEED_DATA.schools.map((s) => ({
          ...s,
          user_id: playerUserId,
          family_unit_id: familyUnitId,
          created_at: new Date().toISOString(),
        })),
      )
      .select();

    if (schoolError) {
      throw schoolError;
    }

    console.log(`✅ Created ${schoolData?.length || 0} schools`);

    // Step 4: Seed coaches
    console.log("⚾ Seeding coaches...");
    const schoolMap = schoolData || [];
    const coachesToInsert = SEED_DATA.coaches.map((coach, idx) => ({
      ...coach,
      school_id: schoolMap[idx % schoolMap.length]?.id,
      user_id: playerUserId,
      family_unit_id: familyUnitId,
      created_at: new Date().toISOString(),
    }));

    const { data: coachData, error: coachError } = await supabase
      .from("coaches")
      .insert(coachesToInsert)
      .select();

    if (coachError) {
      throw coachError;
    }

    console.log(`✅ Created ${coachData?.length || 0} coaches`);

    // Step 5: Reference/support data a fresh project (or reset.ts) lacks.
    await seedReferenceData(supabase, playerUserId);

    console.log("✅ Test database seeded successfully!");
    console.log(`\n📊 Seed Summary:`);
    console.log(`  - Schools: ${schoolData?.length || 0}`);
    console.log(`  - Coaches: ${coachData?.length || 0}`);
    console.log(`  - Test Accounts: 3 (player, parent, admin)`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();
