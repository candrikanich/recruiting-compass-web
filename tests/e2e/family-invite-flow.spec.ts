import { test, expect, type Page } from "@playwright/test";
import { getSupabaseAdmin } from "./seed/helpers/supabase-admin";
import { loginViaForm } from "./helpers/login";

const TEST_PLAYER = {
  email: "test.player2028@andrikanich.com",
  password: "test-password",
};
const TEST_PARENT = {
  email: "test.parent@andrikanich.com",
  password: "test-password",
};

// Unique tokens per run to avoid collisions
const RUN_ID = Date.now();
const VALID_TOKEN = `e2e-valid-${RUN_ID}`;
const EXPIRED_TOKEN = `e2e-expired-${RUN_ID}`;
const DECLINE_TOKEN = `e2e-decline-${RUN_ID}`;
const LOGIN_CONNECT_TOKEN = `e2e-login-connect-${RUN_ID}`;
const REVOKE_TOKEN = `e2e-revoke-${RUN_ID}`;

let seedReady = false;
let validInviteId: string | null = null;
let expiredInviteId: string | null = null;
let declineInviteId: string | null = null;
let loginConnectInviteId: string | null = null;
let revokeInviteId: string | null = null;

async function loginAs(page: Page, email: string, password: string) {
  await loginViaForm(page, email, password, /\/(dashboard|schools|onboarding)/);
}

test.describe("Family Invite Flow", () => {
  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();

      const {
        data: { users },
      } = await supabase.auth.admin.listUsers();
      const playerUser = users.find((u) => u.email === TEST_PLAYER.email);
      if (!playerUser) return;

      const { data: membership } = await supabase
        .from("family_members")
        .select("family_unit_id")
        .eq("user_id", playerUser.id)
        .single();
      if (!membership) return;

      const familyUnitId = membership.family_unit_id;

      const { data: valid } = await supabase
        .from("family_invitations")
        .insert({
          family_unit_id: familyUnitId,
          invited_by: playerUser.id,
          invited_email: "e2e-invite@example.com",
          role: "parent",
          token: VALID_TOKEN,
          status: "pending",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select("id")
        .single();
      validInviteId = valid?.id ?? null;

      const { data: expired } = await supabase
        .from("family_invitations")
        .insert({
          family_unit_id: familyUnitId,
          invited_by: playerUser.id,
          invited_email: "e2e-expired@example.com",
          role: "parent",
          token: EXPIRED_TOKEN,
          status: "pending",
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();
      expiredInviteId = expired?.id ?? null;

      const { data: decline } = await supabase
        .from("family_invitations")
        .insert({
          family_unit_id: familyUnitId,
          invited_by: playerUser.id,
          invited_email: "e2e-decline@example.com",
          role: "parent",
          token: DECLINE_TOKEN,
          status: "pending",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select("id")
        .single();
      declineInviteId = decline?.id ?? null;

      const { data: loginConnect } = await supabase
        .from("family_invitations")
        .insert({
          family_unit_id: familyUnitId,
          invited_by: playerUser.id,
          invited_email: TEST_PARENT.email, // existing user — triggers login form path
          role: "parent",
          token: LOGIN_CONNECT_TOKEN,
          status: "pending",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select("id")
        .single();
      loginConnectInviteId = loginConnect?.id ?? null;

      const { data: revoke } = await supabase
        .from("family_invitations")
        .insert({
          family_unit_id: familyUnitId,
          invited_by: playerUser.id,
          invited_email: "e2e-revoke@example.com",
          role: "parent",
          token: REVOKE_TOKEN,
          status: "pending",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select("id")
        .single();
      revokeInviteId = revoke?.id ?? null;

      if (
        validInviteId &&
        expiredInviteId &&
        declineInviteId &&
        loginConnectInviteId &&
        revokeInviteId
      )
        seedReady = true;
    } catch (e) {
      console.warn("⚠️  Family invite E2E seed failed:", e);
    }
  });

  test.afterAll(async () => {
    const ids = [
      validInviteId,
      expiredInviteId,
      declineInviteId,
      loginConnectInviteId,
      revokeInviteId,
    ].filter(Boolean) as string[];
    if (ids.length === 0) return;
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("family_invitations").delete().in("id", ids);
    } catch {
      // non-fatal
    }
  });

  test.describe("/join page — error states", () => {
    test("no token shows not-found error", async ({ page }) => {
      await page.goto("/join");
      await expect(page.locator('[data-testid="error-not-found"]')).toBeVisible(
        { timeout: 10000 },
      );
    });

    test("invalid token shows not-found error", async ({ page }) => {
      await page.goto("/join?token=invalid-token-xyz-e2e");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator('[data-testid="error-not-found"]')).toBeVisible(
        { timeout: 10000 },
      );
    });

    test("expired token shows expired error", async ({ page }) => {
      test.skip(!seedReady, "Invite seed not available");
      await page.goto(`/join?token=${EXPIRED_TOKEN}`);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator('[data-testid="error-expired"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('[data-testid="error-expired"]')).toContainText(
        "expired",
      );
    });
  });

  test.describe("/join page — valid invite (unauthenticated)", () => {
    test("shows invite details and login form", async ({ page }) => {
      test.skip(!seedReady, "Invite seed not available");
      await page.goto(`/join?token=${VALID_TOKEN}`);
      await page.waitForLoadState("domcontentloaded");

      await expect(
        page.locator('[data-testid="error-not-found"]'),
      ).not.toBeVisible();
      await expect(
        page.locator('[data-testid="error-expired"]'),
      ).not.toBeVisible();

      await expect(page.locator("h1")).toContainText("invited to join");

      await expect(
        page.locator('[data-testid="login-connect-button"]'),
      ).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="password-input"]'),
      ).toBeVisible();
    });
  });

  test.describe("/join page — valid invite (authenticated)", () => {
    test("authenticated user sees connect button instead of login form", async ({
      page,
    }) => {
      test.skip(!seedReady, "Invite seed not available");
      await loginAs(page, TEST_PARENT.email, TEST_PARENT.password);
      await page.goto(`/join?token=${VALID_TOKEN}`);
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator('[data-testid="connect-button"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.locator('[data-testid="login-connect-button"]'),
      ).not.toBeVisible();
    });

    test("authenticated user can accept invite and is redirected to dashboard", async ({
      page,
    }) => {
      test.skip(!seedReady, "Invite seed not available");
      await loginAs(page, TEST_PARENT.email, TEST_PARENT.password);
      await page.goto(`/join?token=${VALID_TOKEN}`);
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator('[data-testid="connect-button"]')).toBeVisible({
        timeout: 10000,
      });

      await page.locator('[data-testid="connect-button"]').click();
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe("/join page — decline flow", () => {
    test("authenticated user can decline invite and sees declined state", async ({
      page,
    }) => {
      test.skip(!seedReady, "Invite seed not available");
      await loginAs(page, TEST_PARENT.email, TEST_PARENT.password);
      await page.goto(`/join?token=${DECLINE_TOKEN}`);
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator('[data-testid="decline-button"]')).toBeVisible({
        timeout: 10000,
      });

      await page.locator('[data-testid="decline-button"]').click();
      await expect(page.locator('[data-testid="invite-declined"]')).toBeVisible(
        { timeout: 10000 },
      );
    });

    test("unauthenticated user sees decline button on valid invite", async ({
      page,
    }) => {
      test.skip(!seedReady, "Invite seed not available");
      await page.goto(`/join?token=${DECLINE_TOKEN}`);
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator('[data-testid="decline-button"]')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe("/join page — unauthenticated login+connect", () => {
    test("existing user can fill password and click login-connect to accept invite", async ({
      page,
    }) => {
      test.skip(!seedReady, "Invite seed not available");
      // Visit join page unauthenticated — invite email matches TEST_PARENT (existing user)
      await page.goto(`/join?token=${LOGIN_CONNECT_TOKEN}`);
      await page.waitForLoadState("domcontentloaded");

      // Should show login form (emailExists=true for TEST_PARENT)
      await expect(
        page.locator('[data-testid="login-connect-button"]'),
      ).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="password-input"]'),
      ).toBeVisible();

      // Fill password (email is pre-filled from invite)
      await page
        .locator('[data-testid="password-input"]')
        .fill(TEST_PARENT.password);

      // Click "Log in and connect"
      await page.locator('[data-testid="login-connect-button"]').click();

      // Should redirect to dashboard after accepting invite
      await page.waitForURL(/\/dashboard/, { timeout: 20000 });
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe("family management — invite revocation", () => {
    test("player can click revoke and pending invite disappears", async ({
      page,
    }) => {
      test.skip(!seedReady, "Invite seed not available");
      await loginAs(page, TEST_PLAYER.email, TEST_PLAYER.password);
      await page.goto("/settings/family-management");
      await page.waitForLoadState("domcontentloaded");

      // Should have at least one pending invite (the REVOKE_TOKEN one)
      await expect(
        page.locator('[data-testid="pending-invite-card"]').first(),
      ).toBeVisible({ timeout: 10000 });

      const countBefore = await page
        .locator('[data-testid="pending-invite-card"]')
        .count();

      // Click the first revoke button
      await page
        .locator('[data-testid="revoke-invite-button"]')
        .first()
        .click();

      // Wait for the list to update
      await page.waitForTimeout(1500);

      const countAfter = await page
        .locator('[data-testid="pending-invite-card"]')
        .count();
      expect(countAfter).toBeLessThan(countBefore);
    });
  });

  test.describe("family management — pending invitations", () => {
    test("pending invite card visible after sending invite", async ({
      page,
    }) => {
      test.skip(!seedReady, "Invite seed not available");
      await loginAs(page, TEST_PLAYER.email, TEST_PLAYER.password);
      await page.goto("/settings/family-management");
      await page.waitForLoadState("domcontentloaded");

      await expect(
        page.locator('[data-testid="pending-invite-card"]').first(),
      ).toBeVisible({ timeout: 10000 });
    });

    test("revoke button present on pending invite card", async ({ page }) => {
      test.skip(!seedReady, "Invite seed not available");
      await loginAs(page, TEST_PLAYER.email, TEST_PLAYER.password);
      await page.goto("/settings/family-management");
      await page.waitForLoadState("domcontentloaded");

      await expect(
        page.locator('[data-testid="revoke-invite-button"]').first(),
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
