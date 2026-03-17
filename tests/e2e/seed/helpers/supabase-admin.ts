import { createClient } from "@supabase/supabase-js";
import { TEST_ACCOUNTS } from "../../config/test-accounts";

export const getSupabaseAdmin = () => {
  const url =
    process.env.TEST_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NUXT_PUBLIC_SUPABASE_URL or TEST_SUPABASE_URL required for test seeding",
    );
  }

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for test seeding");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function createTestAccounts() {
  const supabase = getSupabaseAdmin();

  for (const [key, account] of Object.entries(TEST_ACCOUNTS)) {
    try {
      let userId: string;

      // Try to create the user first
      const { data: createData, error: createError } =
        await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            display_name: account.displayName,
            role: account.role,
          },
        });

      if (createError) {
        if (createError.message?.includes("already been registered") ||
            createError.message?.includes("already registered")) {
          // User exists — look them up by listing users with email filter
          const { data: listData } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const existing = listData?.users?.find((u) => u.email === account.email);
          if (!existing) {
            console.warn(`⚠️  ${account.email} exists but couldn't be found — skipping setup`);
            continue;
          }
          userId = existing.id;
          console.log(`⏭️  Test account already exists: ${account.email}`);
        } else {
          throw createError;
        }
      } else {
        userId = createData.user.id;
        console.log(`✅ Created test account: ${account.email}`);
      }

      // Ensure onboarding is complete and family_unit exists
      await setupTestAccountData(supabase, userId, account);
    } catch (error) {
      console.error(
        `❌ Failed to setup test account ${account.email}:`,
        error,
      );
      // Don't throw — allow other accounts to be created
    }
  }

  // Post-setup: link parent@test.com into player@test.com's family unit
  await linkParentToPlayerFamilyUnit(supabase);
}

/**
 * Ensures parent@test.com is a member of the same family unit as player@test.com.
 * Idempotent — safe to call multiple times.
 */
async function linkParentToPlayerFamilyUnit(
  supabase: ReturnType<typeof getSupabaseAdmin>,
) {
  // Resolve both user IDs
  const { data: listData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const users = listData?.users ?? [];
  const playerUser = users.find((u) => u.email === TEST_ACCOUNTS.player.email);
  const parentUser = users.find((u) => u.email === TEST_ACCOUNTS.parent.email);

  if (!playerUser || !parentUser) {
    console.warn("⚠️  Cannot link parent to player family unit — one or both accounts not found");
    return;
  }

  // Find player's family unit
  const { data: playerMembership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", playerUser.id)
    .maybeSingle();

  if (!playerMembership) {
    console.warn("⚠️  player@test.com has no family unit — cannot link parent");
    return;
  }

  const familyUnitId = playerMembership.family_unit_id;

  // Check if parent is already in this family unit
  const { data: existingMembership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", parentUser.id)
    .eq("family_unit_id", familyUnitId)
    .maybeSingle();

  if (existingMembership) {
    console.log("⏭️  parent@test.com already in player's family unit");
    return;
  }

  // Add parent to player's family unit
  const { error: linkError } = await supabase
    .from("family_members")
    .insert({
      family_unit_id: familyUnitId,
      user_id: parentUser.id,
      role: "parent",
    });

  if (linkError) {
    console.error("❌ Failed to link parent@test.com to player's family unit:", linkError.message);
  } else {
    console.log("✅ Linked parent@test.com to player@test.com's family unit");
  }
}

/**
 * Sets up a test account with onboarding complete and (for players) a family unit.
 * Parent accounts are intentionally skipped here — they are linked to the player's
 * family unit by `linkParentToPlayerFamilyUnit` after all accounts are created.
 * Idempotent — safe to call multiple times.
 */
async function setupTestAccountData(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  account: { displayName: string; role: string; email?: string },
) {
  // Update onboarding status for the user (only update existing row — don't insert)
  // The users row is created by a DB trigger when auth.users is created.
  const { error: userError } = await supabase
    .from("users")
    .update({
      role: account.role as "player" | "parent" | "admin",
      phase_milestone_data: {
        onboarding_complete: true,
        onboarding_completed_at: new Date().toISOString(),
      },
      onboarding_completed: true,
    })
    .eq("id", userId);

  if (userError) {
    // Non-fatal — row might not exist yet if trigger hasn't fired
    console.warn(`⚠️  Could not update users row for ${userId}:`, userError.message);
  }

  // Parent accounts get their family unit membership via linkParentToPlayerFamilyUnit —
  // skip creating a standalone unit for them.
  if (account.role === "parent") return;

  // Check if user already has a family_unit membership
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (membership) return; // Already has family unit

  // Create family unit
  const { data: familyUnit, error: familyError } = await supabase
    .from("family_units")
    .insert({ family_name: `${account.displayName} Family`, created_by_user_id: userId })
    .select()
    .single();

  if (familyError) {
    console.warn(`⚠️  Could not create family_unit for ${userId}:`, familyError.message);
    return;
  }

  // Add user as member of family unit
  const { error: memberError } = await supabase
    .from("family_members")
    .insert({
      family_unit_id: familyUnit.id,
      user_id: userId,
      role: "player",
    });

  if (memberError) {
    console.error(
      `❌ Failed to add ${userId} as member of family unit ${familyUnit.id}:`,
      memberError.message,
    );
    throw memberError;
  }
}

export async function deleteTestAccounts() {
  const supabase = getSupabaseAdmin();

  for (const account of Object.values(TEST_ACCOUNTS)) {
    try {
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email === account.email);

      if (user) {
        await supabase.auth.admin.deleteUser(user.id);
        console.log(`✅ Deleted test account: ${account.email}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to delete test account ${account.email}:`,
        error,
      );
    }
  }
}
