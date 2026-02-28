import { test, expect, type Page } from "@playwright/test";
import { getSupabaseAdmin } from "./seed/helpers/supabase-admin";

const BASE_URL = "http://localhost:3003";

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

let seedReady = false;
let validInviteId: string | null = null;
let expiredInviteId: string | null = null;

async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/(dashboard|schools|onboarding)/, { timeout: 15000 });
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
          expires_at: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select("id")
        .single();
      expiredInviteId = expired?.id ?? null;

      if (validInviteId && expiredInviteId) seedReady = true;
    } catch (e) {
      console.warn("⚠️  Family invite E2E seed failed:", e);
    }
  });

  test.afterAll(async () => {
    const ids = [validInviteId, expiredInviteId].filter(
      Boolean,
    ) as string[];
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
      await page.goto(`${BASE_URL}/join`);
      await expect(
        page.locator('[data-testid="error-not-found"]'),
      ).toBeVisible({ timeout: 10000 });
    });

    test("invalid token shows not-found error", async ({ page }) => {
      await page.goto(`${BASE_URL}/join?token=invalid-token-xyz-e2e`);
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator('[data-testid="error-not-found"]'),
      ).toBeVisible({ timeout: 10000 });
    });

    test("expired token shows expired error", async ({ page }) => {
      test.skip(!seedReady, "Invite seed not available");
      await page.goto(`${BASE_URL}/join?token=${EXPIRED_TOKEN}`);
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator('[data-testid="error-expired"]'),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="error-expired"]'),
      ).toContainText("expired");
    });
  });

  test.describe("/join page — valid invite (unauthenticated)", () => {
    test("shows invite details and login form", async ({ page }) => {
      test.skip(!seedReady, "Invite seed not available");
      await page.goto(`${BASE_URL}/join?token=${VALID_TOKEN}`);
      await page.waitForLoadState("networkidle");

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
      await expect(
        page.locator('[data-testid="email-input"]'),
      ).toBeVisible();
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
      await page.goto(`${BASE_URL}/join?token=${VALID_TOKEN}`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.locator('[data-testid="connect-button"]'),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.locator('[data-testid="login-connect-button"]'),
      ).not.toBeVisible();
    });
  });

  test.describe("family management — pending invitations", () => {
    test("pending invite card visible after sending invite", async ({
      page,
    }) => {
      test.skip(!seedReady, "Invite seed not available");
      await loginAs(page, TEST_PLAYER.email, TEST_PLAYER.password);
      await page.goto(`${BASE_URL}/settings/family-management`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.locator('[data-testid="pending-invite-card"]').first(),
      ).toBeVisible({ timeout: 10000 });
    });

    test("revoke button present on pending invite card", async ({ page }) => {
      test.skip(!seedReady, "Invite seed not available");
      await loginAs(page, TEST_PLAYER.email, TEST_PLAYER.password);
      await page.goto(`${BASE_URL}/settings/family-management`);
      await page.waitForLoadState("networkidle");

      await expect(
        page.locator('[data-testid="revoke-invite-button"]').first(),
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
