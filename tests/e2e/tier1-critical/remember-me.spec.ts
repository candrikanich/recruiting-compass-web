import { test, expect } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { authFixture } from "../fixtures/auth.fixture";
import {
  createOneOffTestUser,
  deleteOneOffTestUser,
} from "../seed/helpers/supabase-admin";

test.describe("Tier 1: Remember Me - Session Persistence", () => {
  // This spec tests the remember-me checkbox on the login form — must start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  let authPage: AuthPage;
  // Per-test cleanup queue: emails created by admin API in the test, deleted in afterEach.
  let createdEmails: string[];

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    createdEmails = [];
    await authFixture.clearAuthState(page);
    await authPage.goto();
  });

  test.afterEach(async () => {
    for (const email of createdEmails) {
      await deleteOneOffTestUser(email).catch(() => {
        // Cleanup failure is non-fatal — orphans get pruned by the next full reset.
      });
    }
  });

  test("should render Remember Me checkbox", async ({ page }) => {
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await expect(checkbox).toBeVisible();

    const label = page.locator('label[for="rememberMe"]');
    await expect(label).toContainText("Remember me");
  });

  test("should have Remember Me checkbox unchecked by default", async ({
    page,
  }) => {
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await expect(checkbox).not.toBeChecked();
  });

  test("should store session with 30-day expiry when Remember Me is checked", async ({
    page,
  }) => {
    const uniqueEmail = `remember-me-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = "TestPassword123!";
    await createOneOffTestUser({
      email: uniqueEmail,
      password,
      displayName: "Remember Me User",
    });
    createdEmails.push(uniqueEmail);

    // Check Remember Me, then log in
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await checkbox.check();
    await authPage.login(uniqueEmail, password, /\/(dashboard|verify-email)/);

    const sessionPrefs = await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      return prefs ? JSON.parse(prefs) : null;
    });

    expect(sessionPrefs).toBeTruthy();
    expect(sessionPrefs.rememberMe).toBe(true);

    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const expiryTime = sessionPrefs.expiresAt - sessionPrefs.lastActivity;
    expect(expiryTime).toBeGreaterThan(thirtyDays - 60000);
    expect(expiryTime).toBeLessThan(thirtyDays + 60000);
  });

  test("should store session with 1-day expiry when Remember Me is unchecked", async ({
    page,
  }) => {
    const uniqueEmail = `no-remember-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = "TestPassword123!";
    await createOneOffTestUser({
      email: uniqueEmail,
      password,
      displayName: "No Remember Me User",
    });
    createdEmails.push(uniqueEmail);

    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await expect(checkbox).not.toBeChecked();
    await authPage.login(uniqueEmail, password, /\/(dashboard|verify-email)/);

    const sessionPrefs = await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      return prefs ? JSON.parse(prefs) : null;
    });

    expect(sessionPrefs).toBeTruthy();
    expect(sessionPrefs.rememberMe).toBe(false);

    const oneDay = 24 * 60 * 60 * 1000;
    const expiryTime = sessionPrefs.expiresAt - sessionPrefs.lastActivity;
    expect(expiryTime).toBeGreaterThan(oneDay - 60000);
    expect(expiryTime).toBeLessThan(oneDay + 60000);
  });

  test("should clear session_preferences on logout", async ({ page }) => {
    const uniqueEmail = `logout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = "TestPassword123!";
    await createOneOffTestUser({
      email: uniqueEmail,
      password,
      displayName: "Logout User",
    });
    createdEmails.push(uniqueEmail);

    await authPage.login(uniqueEmail, password, /\/(dashboard|verify-email)/);

    let sessionPrefs = await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      return prefs ? JSON.parse(prefs) : null;
    });
    expect(sessionPrefs).toBeTruthy();

    await authPage.logout();

    sessionPrefs = await page.evaluate(() => {
      return localStorage.getItem("session_preferences");
    });
    expect(sessionPrefs).toBeNull();
  });

  test("should toggle Remember Me checkbox", async ({ page }) => {
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');

    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("should show timeout message when redirected with timeout query parameter", async ({
    page,
  }) => {
    await page.goto("/login?reason=timeout");

    const timeoutMessage = page.locator("text=logged out due to inactivity");
    await expect(timeoutMessage).toBeVisible();
  });
});
