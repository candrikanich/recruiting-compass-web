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

/**
 * Look up an auth user by email, paginating through listUsers if needed.
 * Supabase's auth.admin.listUsers caps perPage at 1000 server-side, so a
 * single page can miss accounts in larger test/staging databases. This walks
 * pages until found or exhausted.
 */
export async function findAuthUserByEmail(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  email: string,
): Promise<{ id: string; email?: string | null } | null> {
  const normalized = email.toLowerCase();
  let page = 1;
  // Hard cap to avoid infinite loops on misconfigured projects.
  const MAX_PAGES = 50;
  while (page <= MAX_PAGES) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      console.warn(`listUsers page ${page} failed:`, error.message);
      return null;
    }
    const match = data?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === normalized,
    );
    if (match) return match;
    if (!data?.users?.length || data.users.length < 1000) return null;
    page++;
  }
  return null;
}

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
        if (
          createError.message?.includes("already been registered") ||
          createError.message?.includes("already registered")
        ) {
          // User exists — paginate listUsers (capped at 1000/page server-side)
          // until we find the row. Without pagination, large staging DBs miss
          // the account and silently skip data setup.
          const existing = await findAuthUserByEmail(supabase, account.email);
          if (!existing) {
            console.warn(
              `⚠️  ${account.email} exists but couldn't be found — skipping setup`,
            );
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
      console.error(`❌ Failed to setup test account ${account.email}:`, error);
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
  // Resolve both user IDs via paginated lookup (single-page listUsers misses
  // accounts on larger test/staging DBs).
  const playerUser = await findAuthUserByEmail(
    supabase,
    TEST_ACCOUNTS.player.email,
  );
  const parentUser = await findAuthUserByEmail(
    supabase,
    TEST_ACCOUNTS.parent.email,
  );

  if (!playerUser || !parentUser) {
    console.warn(
      "⚠️  Cannot link parent to player family unit — one or both accounts not found",
    );
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

  if (!existingMembership) {
    // Add parent to player's family unit
    const { error: linkError } = await supabase.from("family_members").insert({
      family_unit_id: familyUnitId,
      user_id: parentUser.id,
      role: "parent",
    });

    if (linkError) {
      console.error(
        "❌ Failed to link parent@test.com to player's family unit:",
        linkError.message,
      );
      return;
    }
    console.log("✅ Linked parent@test.com to player@test.com's family unit");
  } else {
    console.log("⏭️  parent@test.com already in player's family unit");
  }

  // Delete any stale parent memberships in OTHER family units. Earlier seed
  // versions created a standalone family_unit for parent before linking, leaving
  // an orphan row. The server's getLinkedAthleteId uses .maybeSingle() against
  // family_members.role="parent" and silently returns null when multiple rows
  // exist — which broke parent-view tests (linked-athlete data never loaded).
  const { error: cleanupError } = await supabase
    .from("family_members")
    .delete()
    .eq("user_id", parentUser.id)
    .neq("family_unit_id", familyUnitId);
  if (cleanupError) {
    console.warn(
      "⚠️  Could not clean up stale parent memberships:",
      cleanupError.message,
    );
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
    console.warn(
      `⚠️  Could not update users row for ${userId}:`,
      userError.message,
    );
  }

  // Seed minimal player profile for player accounts so parent-restriction tests
  // have rendered form fields to assert against. Without primary_sport, the
  // Athletics tab shows "Select a sport on the Basics tab to see positions."
  // and no position buttons exist for the read-only-disabled assertion.
  //
  // Category is "player" (not "player_details") because the page reads via
  // /api/user/preferences/player and parent role redirects to the linked
  // athlete's row of that same category. Idempotent via onConflict against
  // the UNIQUE(user_id, category) constraint. Done BEFORE the family-unit
  // membership early-return so existing accounts still get a fresh seed.
  if (account.role === "player") {
    const { error: prefError } = await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        category: "player",
        data: {
          primary_sport: "Baseball",
          primary_position: "P",
          positions: ["P", "1B"],
          graduation_year: 2027,
          campus_size_preference: "mid",
          cost_sensitivity: "medium",
        },
      },
      { onConflict: "user_id,category" },
    );
    if (prefError) {
      console.warn(
        `⚠️  Could not seed player preferences for ${userId}:`,
        prefError.message,
      );
    }
  }

  // Parent accounts get their family unit membership via linkParentToPlayerFamilyUnit —
  // skip creating a standalone unit for them.
  if (account.role === "parent") return;

  // Check if user already has a family_unit membership
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_unit_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (membership) {
    // Repair stale role: a previous misconfigured run wrote role="parent" on
    // the player's own membership row, which breaks the parent-view linked-
    // athlete lookup (it scans for role="player" in the same family unit).
    // Force role="player" for player accounts.
    if (membership.role !== "player") {
      const { error: repairError } = await supabase
        .from("family_members")
        .update({ role: "player" })
        .eq("user_id", userId)
        .eq("family_unit_id", membership.family_unit_id);
      if (repairError) {
        console.warn(
          `⚠️  Could not repair family_members.role for player ${userId}:`,
          repairError.message,
        );
      } else {
        console.log(
          `🔧 Repaired family_members.role player for ${account.email}`,
        );
      }
    }
    return; // Already has family unit
  }

  // Create family unit
  const { data: familyUnit, error: familyError } = await supabase
    .from("family_units")
    .insert({
      family_name: `${account.displayName} Family`,
      created_by_user_id: userId,
    })
    .select()
    .single();

  if (familyError) {
    console.warn(
      `⚠️  Could not create family_unit for ${userId}:`,
      familyError.message,
    );
    return;
  }

  // Add user as member of family unit
  const { error: memberError } = await supabase.from("family_members").insert({
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

/**
 * Create a one-off test user via Supabase Admin API, bypassing the UI signup flow.
 *
 * Use this in tests that don't actually exercise the signup form — they just need
 * a logged-in user. UI signup takes ~30-45s per call (multi-step form, validation,
 * redirect, and Supabase's 3-signups-per-hour rate limit on free tier); admin API
 * creates the user in ~500ms with no rate limit.
 *
 * Idempotent: if the user already exists, returns the existing user instead of failing.
 */
export async function createOneOffTestUser(opts: {
  email: string;
  password: string;
  displayName: string;
  role?: "player" | "parent";
}) {
  const supabase = getSupabaseAdmin();
  const role = opts.role ?? "parent";
  const [firstName, ...rest] = opts.displayName.split(" ");
  const lastName = rest.join(" ");

  const { data, error } = await supabase.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: true,
    user_metadata: {
      display_name: opts.displayName,
      first_name: firstName,
      last_name: lastName,
      full_name: opts.displayName,
      role,
    },
  });

  if (error) {
    if (
      error.message?.includes("already been registered") ||
      error.message?.includes("already registered")
    ) {
      const { data: list } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const existing = list?.users?.find((u) => u.email === opts.email);
      if (existing) return existing;
    }
    throw new Error(`createOneOffTestUser failed: ${error.message}`);
  }
  return data.user;
}

/**
 * Generate a real Supabase password-recovery link for an existing user.
 *
 * Returns the action_link from supabase.auth.admin.generateLink so tests can
 * page.goto(...) it — supabase-js then processes the hash params on landing,
 * establishing a real recovery session and unlocking the /reset-password
 * form UI for assertions.
 */
export async function generateRecoveryLink(
  email: string,
  redirectTo?: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (error || !data?.properties?.action_link) {
    throw new Error(
      `generateRecoveryLink failed for ${email}: ${error?.message ?? "no action_link returned"}`,
    );
  }
  return data.properties.action_link;
}

/**
 * Delete a one-off test user created by `createOneOffTestUser`.
 *
 * Safe to call even if the user does not exist (no-op).
 */
export async function deleteOneOffTestUser(email: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const user = data?.users?.find((u) => u.email === email);
  if (user) {
    await supabase.auth.admin.deleteUser(user.id);
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
