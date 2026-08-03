import { getSupabaseAdmin, deleteTestAccounts } from "./helpers/supabase-admin";
import { TEST_ACCOUNTS } from "../config/test-accounts";

// This DB is shared with real users (single Supabase project serves prod and
// non-prod). Every delete below MUST be scoped to the test accounts — an
// unscoped .neq("id", <zero-uuid>) here once meant "delete every row in the
// table" under the service-role client.
async function resetDatabase() {
  console.log("🧹 Resetting test database...");

  const supabase = getSupabaseAdmin();

  try {
    const testEmails = new Set(
      Object.values(TEST_ACCOUNTS).map((a) => a.email),
    );
    const { data: listData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const testUserIds = (listData?.users ?? [])
      .filter((u) => u.email && testEmails.has(u.email))
      .map((u) => u.id);

    if (testUserIds.length === 0) {
      console.log("ℹ️  No test accounts found — nothing to clear");
    } else {
      console.log(`Clearing data for ${testUserIds.length} test account(s)...`);

      // Delete in dependency order, scoped to test-account ownership
      await supabase.from("notifications").delete().in("user_id", testUserIds);
      await supabase
        .from("preference_history")
        .delete()
        .in("user_id", testUserIds);
      await supabase
        .from("user_preferences")
        .delete()
        .in("user_id", testUserIds);
      await supabase.from("interactions").delete().in("logged_by", testUserIds);
      await supabase.from("coaches").delete().in("user_id", testUserIds);
      await supabase.from("schools").delete().in("user_id", testUserIds);
      await supabase
        .from("account_links")
        .delete()
        .in("parent_user_id", testUserIds);
      await supabase
        .from("account_links")
        .delete()
        .in("player_user_id", testUserIds);
      await supabase
        .from("account_links")
        .delete()
        .in("initiator_user_id", testUserIds);

      console.log("✅ Test-account data cleared");
    }

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
