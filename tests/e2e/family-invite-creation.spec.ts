import { test, expect, type Page } from "@playwright/test";
import {
  getSupabaseAdmin,
  createOneOffTestUser,
  deleteOneOffTestUser,
} from "./seed/helpers/supabase-admin";
import { loginViaForm } from "./helpers/login";

/**
 * Invite CREATION coverage via the real family-management UI.
 *
 * The existing family-invite-flow spec seeds invitations directly in the DB and
 * only exercises the acceptance half (accept / decline / revoke). It never
 * drives a user CREATING an invite through the UI, and only ever seeds the
 * player→parent direction. This spec fills both gaps by driving
 * `/settings/family-management` (email + role select + submit) for every
 * direction, then asserting the persisted `family_invitations` row:
 *
 *   1. parent → player   (parent-first, then invites their athlete)
 *   2. player → parent    (player-first, then invites a guardian)
 *   3. second parent      (a unit that already has player + parent adds a 2nd
 *                          parent, who then accepts — proving multi-guardian)
 *
 * Each test seeds its own per-run family so no shared account state is touched.
 */

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

const RUN = Date.now();
const PASSWORD = "SeedPass123!";

interface SeededUser {
  email: string;
  userId: string;
}

/**
 * Create a confirmed auth user AND its public.users mirror row (the trigger
 * mis-defaults non-parent roles and can lag, so we upsert deterministically
 * off the returned auth id rather than reading it back) so findUserIdByEmail
 * and family membership both resolve.
 */
async function seedUser(
  supabase: SupabaseAdmin,
  email: string,
  role: "player" | "parent",
  displayName: string,
): Promise<SeededUser> {
  const authUser = await createOneOffTestUser({
    email,
    password: PASSWORD,
    displayName,
    role,
  });
  const userId = authUser?.id;
  if (!userId) throw new Error(`seedUser: ${email} has no auth id after create`);
  await supabase.from("users").upsert(
    {
      id: userId,
      email,
      full_name: displayName,
      role,
      onboarding_completed: true,
      phase_milestone_data: {
        onboarding_complete: true,
        onboarding_completed_at: new Date().toISOString(),
      },
    },
    { onConflict: "id" },
  );
  return { email, userId };
}

/** Create a family unit and add the given members. Returns the unit id. */
async function seedFamilyUnit(
  supabase: SupabaseAdmin,
  ownerUserId: string,
  members: { userId: string; role: "player" | "parent" }[],
): Promise<string> {
  const { data: unit, error } = await supabase
    .from("family_units")
    .insert({
      family_name: `Invite Creation ${RUN} Family`,
      created_by_user_id: ownerUserId,
    })
    .select("id")
    .single();
  if (error || !unit) {
    throw new Error(`seedFamilyUnit: ${error?.message ?? "no unit returned"}`);
  }
  const unitId = unit.id as string;
  const { error: memberErr } = await supabase.from("family_members").insert(
    members.map((m) => ({
      family_unit_id: unitId,
      user_id: m.userId,
      role: m.role,
    })),
  );
  if (memberErr) {
    throw new Error(`seedFamilyUnit members: ${memberErr.message}`);
  }
  return unitId;
}

/** Drive the family-management invite form and submit. */
async function sendInviteViaUi(
  page: Page,
  invitedEmail: string,
  role: "player" | "parent",
): Promise<void> {
  await page.goto("/settings/family-management");
  await expect(page.locator('[data-testid="invite-member-form"]')).toBeVisible();
  await page.locator('[data-testid="invite-email-input"]').fill(invitedEmail);
  await page.locator('[data-testid="invite-role-select"]').selectOption(role);
  await expect(
    page.locator('[data-testid="send-invite-submit"]'),
  ).not.toBeDisabled();
  await page.locator('[data-testid="send-invite-submit"]').click();
}

/** The most-recent invitation for an email in a unit, or null. */
async function findInvite(
  supabase: SupabaseAdmin,
  unitId: string,
  invitedEmail: string,
): Promise<{ id: string; role: string; status: string } | null> {
  const { data } = await supabase
    .from("family_invitations")
    .select("id, role, status")
    .eq("family_unit_id", unitId)
    .eq("invited_email", invitedEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; role: string; status: string } | null) ?? null;
}

test.describe("Family Invite Creation (UI)", () => {
  // Serial: each test seeds and tears down its own family; running them on one
  // worker keeps the shared Supabase project free of overlapping debris.
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: { cookies: [], origins: [] } });

  const supabase = getSupabaseAdmin();
  const createdUserEmails: string[] = [];
  const createdUnitIds: string[] = [];

  test.afterAll(async () => {
    // Invitations + members are FK-bound to units; delete children first.
    for (const unitId of createdUnitIds) {
      await supabase
        .from("family_invitations")
        .delete()
        .eq("family_unit_id", unitId);
      await supabase.from("family_members").delete().eq("family_unit_id", unitId);
      await supabase.from("family_units").delete().eq("id", unitId);
    }
    for (const email of createdUserEmails) {
      await deleteOneOffTestUser(email).catch(() => {});
    }
  });

  test("parent invites a player (parent → player)", async ({ page }) => {
    const parentEmail = `inv-parent-p2c-${RUN}@example.com`;
    const invitedPlayer = `inv-player-target-${RUN}@example.com`;
    const parent = await seedUser(supabase, parentEmail, "parent", "Parent P2C");
    const unitId = await seedFamilyUnit(supabase, parent.userId, [
      { userId: parent.userId, role: "parent" },
    ]);
    createdUserEmails.push(parentEmail);
    createdUnitIds.push(unitId);

    await loginViaForm(page, parentEmail, PASSWORD, /\/(dashboard|schools)/);
    await sendInviteViaUi(page, invitedPlayer, "player");

    await expect(page.getByText(/Invite sent/i)).toBeVisible({ timeout: 15000 });
    const invite = await findInvite(supabase, unitId, invitedPlayer);
    expect(invite).not.toBeNull();
    expect(invite?.role).toBe("player");
    expect(invite?.status).toBe("pending");
  });

  test("player invites a parent (player → parent)", async ({ page }) => {
    const playerEmail = `inv-player-c2p-${RUN}@example.com`;
    const invitedParent = `inv-parent-target-${RUN}@example.com`;
    const player = await seedUser(supabase, playerEmail, "player", "Player C2P");
    const unitId = await seedFamilyUnit(supabase, player.userId, [
      { userId: player.userId, role: "player" },
    ]);
    createdUserEmails.push(playerEmail);
    createdUnitIds.push(unitId);

    await loginViaForm(page, playerEmail, PASSWORD, /\/(dashboard|schools)/);
    await sendInviteViaUi(page, invitedParent, "parent");

    await expect(page.getByText(/Invite sent/i)).toBeVisible({ timeout: 15000 });
    const invite = await findInvite(supabase, unitId, invitedParent);
    expect(invite).not.toBeNull();
    expect(invite?.role).toBe("parent");
    expect(invite?.status).toBe("pending");
  });

  test("second parent is invited to an existing family and accepts", async ({
    page,
  }) => {
    const player = await seedUser(
      supabase,
      `inv-2p-player-${RUN}@example.com`,
      "player",
      "Player 2P",
    );
    const parent1 = await seedUser(
      supabase,
      `inv-2p-parent1-${RUN}@example.com`,
      "parent",
      "Parent One",
    );
    const parent2Email = `inv-2p-parent2-${RUN}@example.com`;
    const parent2 = await seedUser(supabase, parent2Email, "parent", "Parent Two");
    // A unit that ALREADY contains a player + one parent.
    const unitId = await seedFamilyUnit(supabase, parent1.userId, [
      { userId: player.userId, role: "player" },
      { userId: parent1.userId, role: "parent" },
    ]);
    createdUserEmails.push(player.email, parent1.email, parent2Email);
    createdUnitIds.push(unitId);

    // parent1 invites a SECOND parent through the UI.
    await loginViaForm(page, parent1.email, PASSWORD, /\/(dashboard|schools)/);
    await sendInviteViaUi(page, parent2Email, "parent");
    await expect(page.getByText(/Invite sent/i)).toBeVisible({ timeout: 15000 });

    const invite = await findInvite(supabase, unitId, parent2Email);
    expect(invite).not.toBeNull();
    expect(invite?.role).toBe("parent");
    const token = await (async () => {
      const { data } = await supabase
        .from("family_invitations")
        .select("token")
        .eq("id", invite!.id)
        .single();
      return (data as { token: string }).token;
    })();

    // parent2 logs in and accepts via the /join link.
    await page.context().clearCookies();
    await loginViaForm(page, parent2Email, PASSWORD, /\/(dashboard|schools)/);
    await page.goto(`/join?token=${token}`);
    await expect(page.locator('[data-testid="connect-button"]')).toBeVisible({
      timeout: 15000,
    });
    await page.locator('[data-testid="connect-button"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // The unit now has TWO parent members.
    const { data: parents } = await supabase
      .from("family_members")
      .select("user_id")
      .eq("family_unit_id", unitId)
      .eq("role", "parent");
    expect((parents ?? []).length).toBe(2);
  });
});
