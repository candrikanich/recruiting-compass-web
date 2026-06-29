import { test, expect, type Page } from "@playwright/test";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
} from "./seed/helpers/supabase-admin";
import { loginViaForm } from "./helpers/login";
import { TEST_ACCOUNTS } from "./config/test-accounts";

const TEST_PLAYER = {
  email: TEST_ACCOUNTS.player.email,
  password: TEST_ACCOUNTS.player.password,
};
const TEST_PARENT = {
  email: TEST_ACCOUNTS.parent.email,
  password: TEST_ACCOUNTS.parent.password,
};

// Unique tokens per run to avoid collisions
const RUN_ID = Date.now();
const VALID_TOKEN = `e2e-valid-${RUN_ID}`;
const EXPIRED_TOKEN = `e2e-expired-${RUN_ID}`;
const DECLINE_TOKEN = `e2e-decline-${RUN_ID}`;
// Read-only token for the decline-button visibility test — DECLINE_TOKEN gets
// mutated to 'declined' by the authenticated-decline test, so a visibility-only
// test needs its own pending invite that nothing else touches.
const DECLINE_VIEW_TOKEN = `e2e-decline-view-${RUN_ID}`;
const LOGIN_CONNECT_TOKEN = `e2e-login-connect-${RUN_ID}`;
const REVOKE_TOKEN = `e2e-revoke-${RUN_ID}`;
// Unique per run: a STATIC invited_email let prior runs + parallel workers pile
// invites onto the same address, so the revoke test's card count oscillated
// (debris) and "count drops by 1" raced. A run-scoped email seeds exactly one
// matching card → deterministic.
const REVOKE_EMAIL = `e2e-revoke-${RUN_ID}@example.com`;

let seedReady = false;
let seedError: string | null = null;

// Full /join + family-management invite flow is exercised here. Tests only skip
// when the DB seed itself is unavailable (seedReady=false). The earlier app gaps
// (decline 500 from a too-narrow status CHECK, missing Bearer token on decline,
// auth-vs-storageState mismatches) are fixed.
let validInviteId: string | null = null;
let expiredInviteId: string | null = null;
let declineInviteId: string | null = null;
let declineViewInviteId: string | null = null;
let loginConnectInviteId: string | null = null;
let revokeInviteId: string | null = null;

async function loginAs(page: Page, email: string, password: string) {
  await loginViaForm(page, email, password, /\/(dashboard|schools|onboarding)/);
}

test.describe("Family Invite Flow", () => {
  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();

      const playerUserId = await findUserIdByEmail(supabase, TEST_PLAYER.email);
      if (!playerUserId) {
        seedError = `player user not found in public.users: ${TEST_PLAYER.email}`;
        return;
      }

      const { data: membership } = await supabase
        .from("family_members")
        .select("family_unit_id")
        .eq("user_id", playerUserId)
        .maybeSingle();
      if (!membership) {
        seedError = `player has no family_members row (user_id=${playerUserId})`;
        return;
      }

      const familyUnitId = membership.family_unit_id;

      const { data: valid } = await supabase
        .from("family_invitations")
        .insert({
          family_unit_id: familyUnitId,
          invited_by: playerUserId,
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
          invited_by: playerUserId,
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
          invited_by: playerUserId,
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

      const { data: declineView } = await supabase
        .from("family_invitations")
        .insert({
          family_unit_id: familyUnitId,
          invited_by: playerUserId,
          invited_email: "e2e-decline-view@example.com",
          role: "parent",
          token: DECLINE_VIEW_TOKEN,
          status: "pending",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select("id")
        .single();
      declineViewInviteId = declineView?.id ?? null;

      const { data: loginConnect } = await supabase
        .from("family_invitations")
        .insert({
          family_unit_id: familyUnitId,
          invited_by: playerUserId,
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
          invited_by: playerUserId,
          invited_email: REVOKE_EMAIL,
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
        declineViewInviteId &&
        loginConnectInviteId &&
        revokeInviteId
      ) {
        seedReady = true;
      } else {
        seedError = `partial seed: valid=${!!validInviteId} expired=${!!expiredInviteId} decline=${!!declineInviteId} declineView=${!!declineViewInviteId} loginConnect=${!!loginConnectInviteId} revoke=${!!revokeInviteId}`;
      }
    } catch (e) {
      seedError = e instanceof Error ? e.message : String(e);
      console.warn("⚠️  Family invite E2E seed failed:", e);
    }
  });

  test.afterAll(async () => {
    const ids = [
      validInviteId,
      expiredInviteId,
      declineInviteId,
      declineViewInviteId,
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
      // Verified working: server returns 410, page renders error-expired.
      // Only gated on seedReady (not BLOCKED_BY_APP_GAP).
      test.skip(!seedReady, `Invite seed not available: ${seedError}`);
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
    // Override the global player storageState — these tests must be logged out.
    test.use({ storageState: { cookies: [], origins: [] } });
    test("shows invite details and login form", async ({ page }) => {
      test.skip(!seedReady, `Invite seed not available: ${seedError}`);
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
      test.skip(!seedReady, `Invite seed not available: ${seedError}`);
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
      test.skip(!seedReady, `Invite seed not available: ${seedError}`);
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
      test.skip(!seedReady, `Invite seed not available: ${seedError}`);
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
      test.skip(!seedReady, `Invite seed not available: ${seedError}`);
      // Use the dedicated read-only token — DECLINE_TOKEN is mutated to
      // 'declined' by the authenticated-decline test running in parallel.
      await page.goto(`/join?token=${DECLINE_VIEW_TOKEN}`);
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator('[data-testid="decline-button"]')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe("/join page — unauthenticated login+connect", () => {
    // Override the global player storageState — this test must be logged out.
    test.use({ storageState: { cookies: [], origins: [] } });
    test("existing user can fill password and click login-connect to accept invite", async ({
      page,
    }) => {
      test.skip(!seedReady, `Invite seed not available: ${seedError}`);
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

      // The testid sits on the DesignSystemInput wrapper — target the inner
      // <input> to fill. Email is not pre-filled, so supply both credentials.
      await page
        .locator('[data-testid="email-input"] input')
        .fill(TEST_PARENT.email);
      await page
        .locator('[data-testid="password-input"] input')
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
      test.skip(!seedReady, `Invite seed not available: ${seedError}`);
      await loginAs(page, TEST_PLAYER.email, TEST_PLAYER.password);
      await page.goto("/settings/family-management");
      await page.waitForLoadState("domcontentloaded");

      // Scope to this run's unique invited_email (REVOKE_EMAIL is RUN_ID-keyed),
      // so neither prior-run debris nor parallel workers can perturb the count —
      // exactly one matching card is seeded. Revoke it and assert it's gone.
      const revokeCards = page.locator('[data-testid="pending-invite-card"]', {
        hasText: REVOKE_EMAIL,
      });
      await expect(revokeCards.first()).toBeVisible({ timeout: 10000 });
      const matchingBefore = await revokeCards.count();

      // Revoke fires DELETE then refetches — poll until ours disappears.
      await revokeCards
        .first()
        .locator('[data-testid="revoke-invite-button"]')
        .click();
      await expect(revokeCards).toHaveCount(matchingBefore - 1, {
        timeout: 10000,
      });
    });
  });

  test.describe("family management — pending invitations", () => {
    test("pending invite card visible after sending invite", async ({
      page,
    }) => {
      test.skip(!seedReady, `Invite seed not available: ${seedError}`);
      await loginAs(page, TEST_PLAYER.email, TEST_PLAYER.password);
      await page.goto("/settings/family-management");
      await page.waitForLoadState("domcontentloaded");

      await expect(
        page.locator('[data-testid="pending-invite-card"]').first(),
      ).toBeVisible({ timeout: 10000 });
    });

    test("revoke button present on pending invite card", async ({ page }) => {
      test.skip(!seedReady, `Invite seed not available: ${seedError}`);
      await loginAs(page, TEST_PLAYER.email, TEST_PLAYER.password);
      await page.goto("/settings/family-management");
      await page.waitForLoadState("domcontentloaded");

      await expect(
        page.locator('[data-testid="revoke-invite-button"]').first(),
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
