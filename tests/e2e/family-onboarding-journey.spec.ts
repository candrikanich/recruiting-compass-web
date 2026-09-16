import { test, expect, type Page } from "@playwright/test";
import { getSupabaseAdmin } from "./seed/helpers/supabase-admin";
import { loginViaForm } from "./helpers/login";

/**
 * Full chained entry journey: a brand-new parent signs up, creates a family
 * unit, invites a player through the real UI, the player accepts by
 * creating their own account, both complete their own 1-page(ish)
 * onboarding wizard, and the parent's dashboard reflects the newly
 * connected athlete.
 *
 * Every other entry-flow spec exercises a FRAGMENT of this journey in
 * isolation — signup-flow.spec.ts stops at the post-signup redirect,
 * onboarding-completion.spec.ts starts and ends inside one account's
 * wizard, family-invite-creation.spec.ts starts from already-seeded
 * logged-in users and stops at "invite sent"/accept without touching
 * onboarding, and minor-invite-accept.spec.ts covers the COPPA/RLS edge
 * of accept but not the parent side. None of them chain
 * signup → family create → invite → accept → onboarding → dashboard as
 * one journey — this spec is that missing chain.
 *
 * Single page instance, cookies cleared between identity switches (same
 * pattern as family-invite-creation.spec.ts's second-parent-accepts test) —
 * no second browser context needed since the two identities never need to
 * be live simultaneously.
 *
 * Debris accounts are reaped by global-teardown's @example.com sweep;
 * family_units/family_invitations rows are cleaned up explicitly here since
 * teardown only targets users.
 */

const RUN = Date.now();
const PASSWORD = "SecurePass123";

async function signUpParent(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.click('[data-testid="user-type-parent"]');
  await expect(page.locator('[data-testid="signup-form-parent"]')).toBeVisible();

  await page.fill("#firstName", "Parent");
  await page.fill("#lastName", "Journey");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.fill("#confirmPassword", PASSWORD);
  await page.check("#agreeToTerms");
  await expect(page.locator('[data-testid="signup-button"]')).not.toBeDisabled();
  await page.click('[data-testid="signup-button"]');
}

test.describe("Full family onboarding journey (signup → invite → accept → dashboard)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const supabase = getSupabaseAdmin();
  let familyUnitId: string | null = null;

  test.afterAll(async () => {
    if (!familyUnitId) return;
    await supabase.from("family_invitations").delete().eq("family_unit_id", familyUnitId);
    await supabase.from("family_members").delete().eq("family_unit_id", familyUnitId);
    await supabase.from("family_units").delete().eq("id", familyUnitId);
  });

  test("parent signs up, creates family, invites a player who accepts and connects", async ({
    page,
  }) => {
    const parentEmail = `journey-parent-${RUN}@example.com`;
    const playerEmail = `journey-player-${RUN}@example.com`;

    // ---- 1. Parent signs up ----
    await signUpParent(page, parentEmail);

    // Parent signup lands on the dedicated parent onboarding wizard.
    await expect(page).toHaveURL(/\/onboarding\/parent/, { timeout: 15000 });

    // ---- 2. Parent completes their own onboarding (placeholder player profile) ----
    await page.locator('[data-testid="player-name"]').fill("Placeholder Kid");
    await page.locator('[data-testid="player-dob"]').fill("2008-05-10");
    await page.locator('[data-testid="graduation-year"]').selectOption({ index: 1 });
    await page.locator('[data-testid="sport"]').selectOption("Baseball");
    await page.locator('[data-testid="next-button"]').click();

    await expect(page.locator('[data-testid="step-2"]')).toBeVisible({
      timeout: 10000,
    });
    await page.locator('[data-testid="go-to-dashboard"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // No real athlete is connected yet — the empty-state CTA should show.
    await expect(
      page.getByRole("heading", { name: "Your athlete isn't connected yet" }),
    ).toBeVisible({ timeout: 10000 });

    // Scope precisely via the parent's own user id (avoids racing other
    // parallel workers/tests on a "most recent" lookup).
    const { data: parentUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", parentEmail)
      .single();
    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", parentUser!.id)
      .eq("role", "parent")
      .single();
    familyUnitId = membership!.family_unit_id as string;
    expect(familyUnitId).toBeTruthy();

    // ---- 3. Parent invites a player through the real UI ----
    await page.goto("/settings/family-management");
    await expect(page.locator('[data-testid="invite-member-form"]')).toBeVisible();
    await page.locator('[data-testid="invite-email-input"]').fill(playerEmail);
    await page.locator('[data-testid="invite-role-select"]').selectOption("player");
    await expect(page.locator('[data-testid="send-invite-submit"]')).not.toBeDisabled();
    await page.locator('[data-testid="send-invite-submit"]').click();
    await expect(page.getByText(/Invite sent/i)).toBeVisible({ timeout: 15000 });

    const { data: invite } = await supabase
      .from("family_invitations")
      .select("id, token, status")
      .eq("family_unit_id", familyUnitId)
      .eq("invited_email", playerEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(invite?.status).toBe("pending");
    const token = invite!.token as string;

    // ---- 4. Switch identity: the invited player accepts by creating an account ----
    await page.context().clearCookies();
    await page.goto(`/join?token=${token}`);
    await expect(page.getByTestId("signup-section")).toBeVisible();

    await page.fill("#firstName", "Real");
    await page.fill("#lastName", "Player");
    // Adult DOB — the minor/RLS-invite edge is covered separately by
    // minor-invite-accept.spec.ts; this journey stays on the happy path.
    await page.fill("#invite-dob", "2005-01-15");
    await expect(page.locator("#invite-email")).toHaveValue(playerEmail);
    await page.fill("#password", PASSWORD);
    await page.fill("#confirmPassword", PASSWORD);
    await page.check("#invite-terms");
    await page.getByRole("button", { name: /create account and connect/i }).click();

    // Accept succeeds → player is routed into their own onboarding wizard.
    await expect(page).toHaveURL(/\/onboarding(\/|$|\?)/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/onboarding\/parent/);

    // ---- 5. Player completes their own onboarding ----
    await page.locator("#onboarding-graduation-year").selectOption({ index: 1 });
    await page.locator("#onboarding-primary-sport").selectOption("Baseball");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", { name: "Schools to explore" }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /go to your dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // ---- 6. DB assertions: player is a real family member, invite accepted ----
    const { data: acceptedInvite } = await supabase
      .from("family_invitations")
      .select("status")
      .eq("id", invite!.id)
      .single();
    expect(acceptedInvite?.status).toBe("accepted");

    const { data: playerUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", playerEmail)
      .single();
    const { data: playerMembership } = await supabase
      .from("family_members")
      .select("family_unit_id, role")
      .eq("user_id", playerUser!.id)
      .single();
    expect(playerMembership?.family_unit_id).toBe(familyUnitId);
    expect(playerMembership?.role).toBe("player");

    // ---- 7. Switch back to the parent: dashboard now shows a connected athlete ----
    await page.context().clearCookies();
    await loginViaForm(page, parentEmail, PASSWORD, /\/(dashboard|schools)/);
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Your athlete isn't connected yet" }),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
