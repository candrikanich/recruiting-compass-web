import {
  createClient,
  type RealtimeClientOptions,
} from "@supabase/supabase-js";
import ws from "ws";
import { TEST_ACCOUNTS } from "../../config/test-accounts";

// supabase-js eagerly constructs a RealtimeClient inside createClient. On
// Node < 22 (no native global WebSocket) that constructor throws unless a
// transport is supplied. Tests never open realtime channels, but the client
// still needs a WebSocket implementation to be built.
const realtimeOptions: RealtimeClientOptions = {
  transport: ws as unknown as RealtimeClientOptions["transport"],
};

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
    realtime: realtimeOptions,
  });
};

export interface SeededSchools {
  schoolIds: string[];
  interactionIds: string[];
}

/**
 * Seed N schools for a family unit, each with one recent interaction.
 *
 * Reusable across specs that need "the athlete has tracked schools with contact
 * history" (dashboard contact-frequency, schools lists, task/interaction flows).
 * Interactions default to within the last 7 days so the contact-frequency widget
 * renders them as recent (green) contacts. Returns ids for afterAll cleanup.
 */
export async function seedSchoolsWithInteractions(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  opts: {
    familyUnitId: string;
    userId: string;
    runId: number;
    count?: number;
    daysAgo?: number[];
  },
): Promise<SeededSchools> {
  const count = opts.count ?? 4;
  const daysAgo = opts.daysAgo ?? [2, 3, 4, 5];
  const day = 24 * 60 * 60 * 1000;

  const schoolRows = Array.from({ length: count }, (_, i) => ({
    name: `[e2e-${opts.runId}] Contact School ${i + 1}`,
    family_unit_id: opts.familyUnitId,
    user_id: opts.userId,
    status: "researching",
  }));

  const { data: schools, error: schoolErr } = await supabase
    .from("schools")
    .insert(schoolRows)
    .select("id");
  if (schoolErr || !schools) {
    throw new Error(`seedSchoolsWithInteractions schools: ${schoolErr?.message}`);
  }
  const schoolIds = schools.map((s) => s.id as string);

  const interactionRows = schoolIds.map((schoolId, i) => ({
    school_id: schoolId,
    family_unit_id: opts.familyUnitId,
    logged_by: opts.userId,
    type: "email" as const,
    direction: i % 2 === 0 ? ("outbound" as const) : ("inbound" as const),
    sentiment: "positive" as const,
    subject: `[e2e-${opts.runId}] Contact ${i + 1}`,
    content: `Seeded recent contact ${i + 1}.`,
    occurred_at: new Date(
      Date.now() - (daysAgo[i % daysAgo.length] ?? 3) * day,
    ).toISOString(),
  }));

  const { data: interactions, error: intErr } = await supabase
    .from("interactions")
    .insert(interactionRows)
    .select("id");
  if (intErr) {
    // Roll back the schools so we don't leak partial seed.
    await supabase.from("schools").delete().in("id", schoolIds);
    throw new Error(`seedSchoolsWithInteractions interactions: ${intErr.message}`);
  }

  return {
    schoolIds,
    interactionIds: (interactions ?? []).map((r) => r.id as string),
  };
}

/** Delete rows created by seedSchoolsWithInteractions (interactions first). */
export async function deleteSeededSchools(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  seeded: SeededSchools,
): Promise<void> {
  if (seeded.interactionIds.length > 0) {
    await supabase.from("interactions").delete().in("id", seeded.interactionIds);
  }
  if (seeded.schoolIds.length > 0) {
    await supabase.from("schools").delete().in("id", seeded.schoolIds);
  }
}

/**
 * Look up an auth user's ID by email via the public.users mirror table.
 *
 * Direct `auth.admin.listUsers()` is capped at perPage=1000 — once the auth
 * table accumulates >1000 rows (test debris piles up fast), our test accounts
 * fall off the first page and lookups silently return undefined, which then
 * makes `seedReady` stay false and every dependent test skip without
 * explanation. The public.users mirror is populated by a DB trigger from
 * auth.users and has no pagination cap, so it's the safe lookup path.
 */
export async function findUserIdByEmail(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    console.warn(`⚠️  findUserIdByEmail(${email}) failed:`, error.message);
    return null;
  }
  return ((data as { id?: string } | null)?.id as string | undefined) ?? null;
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
          const existingId = await findUserIdByEmail(supabase, account.email);
          if (!existingId) {
            console.warn(
              `⚠️  ${account.email} exists but couldn't be found in public.users — skipping setup`,
            );
            continue;
          }
          userId = existingId;
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
  // Resolve both user IDs via public.users (avoids auth.admin pagination cap)
  const playerUserId = await findUserIdByEmail(
    supabase,
    TEST_ACCOUNTS.player.email,
  );
  const parentUserId = await findUserIdByEmail(
    supabase,
    TEST_ACCOUNTS.parent.email,
  );

  if (!playerUserId || !parentUserId) {
    console.warn(
      "⚠️  Cannot link parent to player family unit — one or both accounts not found",
    );
    return;
  }

  // Find player's family unit
  const { data: playerMembership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", playerUserId)
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
    .eq("user_id", parentUserId)
    .eq("family_unit_id", familyUnitId)
    .maybeSingle();

  if (existingMembership) {
    console.log("⏭️  parent@test.com already in player's family unit");
    return;
  }

  // Add parent to player's family unit
  const { error: linkError } = await supabase.from("family_members").insert({
    family_unit_id: familyUnitId,
    user_id: parentUserId,
    role: "parent",
  });

  if (linkError) {
    console.error(
      "❌ Failed to link parent@test.com to player's family unit:",
      linkError.message,
    );
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
    console.warn(
      `⚠️  Could not update users row for ${userId}:`,
      userError.message,
    );
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
