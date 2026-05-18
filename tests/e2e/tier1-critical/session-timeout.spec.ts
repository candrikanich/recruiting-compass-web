import { test, expect } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { authFixture } from "../fixtures/auth.fixture";
import {
  createOneOffTestUser,
  deleteOneOffTestUser,
} from "../seed/helpers/supabase-admin";

test.describe("Tier 1: Session Timeout - Warning and Logout", () => {
  // This spec tests login/signup and session behavior — must start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  let authPage: AuthPage;
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

  test("should not show warning modal for users without Remember Me", async ({
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

    const warningModal = page.locator("text=Session Timeout Warning");
    await expect(warningModal).not.toBeVisible();
  });

  test("should display warning modal after extended inactivity for Remember Me users", async ({
    page,
  }) => {
    const uniqueEmail = `session-warning-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = "TestPassword123!";
    await createOneOffTestUser({
      email: uniqueEmail,
      password,
      displayName: "Session Warning User",
    });
    createdEmails.push(uniqueEmail);

    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await checkbox.check();
    await authPage.login(uniqueEmail, password, /\/(dashboard|verify-email)/);

    // Simulate near-timeout by manipulating localStorage
    await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        parsed.lastActivity = Date.now() - (thirtyDays - 4 * 60 * 1000);
        localStorage.setItem("session_preferences", JSON.stringify(parsed));
      }
    });

    await page.goto("/dashboard");

    const warningModal = page.locator("text=Session Timeout Warning");
    await expect(warningModal).toBeVisible({ timeout: 5000 });

    const timerText = page.locator("text=Time remaining:");
    await expect(timerText).toBeVisible();

    const stayButton = page.locator('button:has-text("Stay Logged In")');
    await expect(stayButton).toBeVisible();

    const logoutButton = page.locator('button:has-text("Logout Now")');
    await expect(logoutButton).toBeVisible();
  });

  test('should extend session when "Stay Logged In" button is clicked', async ({
    page,
  }) => {
    const uniqueEmail = `stay-logged-in-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = "TestPassword123!";
    await createOneOffTestUser({
      email: uniqueEmail,
      password,
      displayName: "Stay Logged In User",
    });
    createdEmails.push(uniqueEmail);

    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await checkbox.check();
    await authPage.login(uniqueEmail, password, /\/(dashboard|verify-email)/);

    const originalPrefs = await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      return prefs ? JSON.parse(prefs) : null;
    });
    const originalLastActivity = originalPrefs.lastActivity;

    await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        parsed.lastActivity = Date.now() - (thirtyDays - 4 * 60 * 1000);
        localStorage.setItem("session_preferences", JSON.stringify(parsed));
      }
    });

    await page.goto("/dashboard");

    const warningModal = page.locator("text=Session Timeout Warning");
    await expect(warningModal).toBeVisible({ timeout: 5000 });

    const stayButton = page.locator('button:has-text("Stay Logged In")');
    await stayButton.click();

    await expect(warningModal).not.toBeVisible();

    const updatedPrefs = await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      return prefs ? JSON.parse(prefs) : null;
    });
    expect(updatedPrefs.lastActivity).toBeGreaterThan(originalLastActivity);
  });

  test('should logout when "Logout Now" button is clicked', async ({
    page,
  }) => {
    const uniqueEmail = `logout-now-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = "TestPassword123!";
    await createOneOffTestUser({
      email: uniqueEmail,
      password,
      displayName: "Logout Now User",
    });
    createdEmails.push(uniqueEmail);

    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await checkbox.check();
    await authPage.login(uniqueEmail, password, /\/(dashboard|verify-email)/);

    await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        parsed.lastActivity = Date.now() - (thirtyDays - 4 * 60 * 1000);
        localStorage.setItem("session_preferences", JSON.stringify(parsed));
      }
    });

    await page.goto("/dashboard");

    const warningModal = page.locator("text=Session Timeout Warning");
    await expect(warningModal).toBeVisible({ timeout: 5000 });

    const logoutButton = page.locator('button:has-text("Logout Now")');
    await logoutButton.click();

    await page.waitForURL("/login?reason=timeout");

    const sessionPrefs = await page.evaluate(() => {
      return localStorage.getItem("session_preferences");
    });
    expect(sessionPrefs).toBeNull();
  });

  test("should show timeout message when accessing app after session expiry", async ({
    page,
  }) => {
    const uniqueEmail = `expired-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = "TestPassword123!";
    await createOneOffTestUser({
      email: uniqueEmail,
      password,
      displayName: "Expired Session User",
    });
    createdEmails.push(uniqueEmail);

    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await checkbox.check();
    await authPage.login(uniqueEmail, password, /\/(dashboard|verify-email)/);

    await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        parsed.lastActivity = Date.now() - 31 * 24 * 60 * 60 * 1000;
        localStorage.setItem("session_preferences", JSON.stringify(parsed));
      }
    });

    await page.goto("/dashboard");

    await page.waitForURL("/login?reason=timeout");

    const timeoutMessage = page.locator("text=logged out due to inactivity");
    await expect(timeoutMessage).toBeVisible();

    const sessionPrefs = await page.evaluate(() => {
      return localStorage.getItem("session_preferences");
    });
    expect(sessionPrefs).toBeNull();
  });
});
