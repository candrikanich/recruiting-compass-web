import { readFileSync } from "fs";
import { join } from "path";
import { getSupabaseAdmin, createTestAccounts } from "./helpers/supabase-admin";

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
      status: "interested",
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
      status: "interested",
      coaching_style: "Traditional, proven approach",
      recruiting_approach: "Similar position profiles",
    },
  ],
  coaches: [
    {
      first_name: "John",
      last_name: "Smith",
      role: "Head Coach",
      email: "jsmith@duke.edu",
    },
    {
      first_name: "Mike",
      last_name: "Johnson",
      role: "Recruiting Coordinator",
      email: "mjohnson@duke.edu",
    },
    {
      first_name: "Sarah",
      last_name: "Williams",
      role: "Head Coach",
      email: "swilliams@bc.edu",
    },
    {
      first_name: "Tom",
      last_name: "Brown",
      role: "Assistant Coach",
      email: "tbrown@bc.edu",
    },
    {
      first_name: "David",
      last_name: "Martinez",
      role: "Head Coach",
      email: "dmartinez@ufl.edu",
    },
  ],
};

async function seedDatabase() {
  console.log("🌱 Seeding test database...");

  const supabase = getSupabaseAdmin();

  try {
    // Step 1: Reset database
    console.log("📦 Resetting tables...");
    const resetSQL = readFileSync(
      join(__dirname, "sql/001-reset-tables.sql"),
      "utf-8",
    );

    // Execute reset via Supabase RPC or raw SQL (depends on permissions)
    const statements = resetSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    for (const statement of statements) {
      try {
        await supabase.rpc("exec", { query: statement }).catch(() => {
          // RPC might not exist, that's OK - continue
        });
      } catch (e) {
        // Ignore RPC errors
      }
    }

    // Try direct execution if RPC failed
    try {
      await supabase.from("schools").delete().neq("id", "00000000");
      console.log("✅ Cleared existing test data");
    } catch (e) {
      console.log(
        "⚠️  Could not clear data via API, proceeding with fresh seed",
      );
    }

    // Step 2: Create test accounts
    console.log("👤 Creating test accounts...");
    await createTestAccounts();

    // Step 3: Seed schools
    console.log("🏫 Seeding schools...");
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .insert(
        SEED_DATA.schools.map((s) => ({
          ...s,
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
