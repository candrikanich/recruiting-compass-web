import { getSupabaseAdmin, deleteTestAccounts } from "./helpers/supabase-admin";

async function resetDatabase() {
  console.log("🧹 Resetting test database...");

  const supabase = getSupabaseAdmin();

  try {
    // Delete all user-generated data
    console.log("Clearing user data...");

    // Delete in dependency order
    await supabase
      .from("notifications")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("preference_history")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("user_preferences")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("athlete_tasks")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("interactions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("coaches")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("schools")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("account_links")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("✅ User data cleared");

    // Delete test accounts
    console.log("Deleting test accounts...");
    await deleteTestAccounts();

    console.log("✅ Test database reset complete");
  } catch (error) {
    console.error("❌ Reset failed:", error);
    process.exit(1);
  }
}

resetDatabase();
