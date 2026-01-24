import { test, expect } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { authFixture } from "../fixtures/auth.fixture";
import { testUsers } from "../fixtures/testData";

test.describe("Tier 1: Remember Me - Session Persistence", () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authFixture.clearAuthState(page);
    await authPage.goto();
  });

  test("should render Remember Me checkbox", async ({ page }) => {
    authPage = new AuthPage(page);

    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    expect(checkbox).toBeVisible();

    const label = page.locator('label[for="rememberMe"]');
    expect(label).toContainText("Remember me on this device");
    expect(label).toContainText("30 days");
  });

  test("should have Remember Me checkbox unchecked by default", async ({
    page,
  }) => {
    authPage = new AuthPage(page);

    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await expect(checkbox).not.toBeChecked();
  });

  test("should store session with 30-day expiry when Remember Me is checked", async ({
    page,
    context,
  }) => {
    authPage = new AuthPage(page);

    // Create a unique test user
    const uniqueEmail = `remember-me-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    const displayName = "Remember Me User";

    // Signup first
    await authPage.signup(uniqueEmail, password, displayName);

    // Logout to return to login page
    await authPage.logout();
    await authPage.expectLoginPage();

    // Check the Remember Me checkbox
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await checkbox.check();

    // Login
    await authPage.login(uniqueEmail, password);

    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|verify-email)/);

    // Check that session_preferences is in localStorage with 30-day expiry
    const sessionPrefs = await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      return prefs ? JSON.parse(prefs) : null;
    });

    expect(sessionPrefs).toBeTruthy();
    expect(sessionPrefs.rememberMe).toBe(true);

    // Verify 30-day expiry (approximately)
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const expiryTime = sessionPrefs.expiresAt - sessionPrefs.lastActivity;
    // Allow 1 minute tolerance
    expect(expiryTime).toBeGreaterThan(thirtyDays - 60000);
    expect(expiryTime).toBeLessThan(thirtyDays + 60000);
  });

  test("should store session with 1-day expiry when Remember Me is unchecked", async ({
    page,
  }) => {
    authPage = new AuthPage(page);

    // Create a unique test user
    const uniqueEmail = `no-remember-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    const displayName = "No Remember Me User";

    // Signup first
    await authPage.signup(uniqueEmail, password, displayName);

    // Logout to return to login page
    await authPage.logout();
    await authPage.expectLoginPage();

    // Don't check the Remember Me checkbox (default)
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await expect(checkbox).not.toBeChecked();

    // Login
    await authPage.login(uniqueEmail, password);

    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|verify-email)/);

    // Check that session_preferences is in localStorage with 1-day expiry
    const sessionPrefs = await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      return prefs ? JSON.parse(prefs) : null;
    });

    expect(sessionPrefs).toBeTruthy();
    expect(sessionPrefs.rememberMe).toBe(false);

    // Verify 1-day expiry (approximately)
    const oneDay = 24 * 60 * 60 * 1000;
    const expiryTime = sessionPrefs.expiresAt - sessionPrefs.lastActivity;
    // Allow 1 minute tolerance
    expect(expiryTime).toBeGreaterThan(oneDay - 60000);
    expect(expiryTime).toBeLessThan(oneDay + 60000);
  });

  test("should clear session_preferences on logout", async ({ page }) => {
    authPage = new AuthPage(page);

    // Create a unique test user
    const uniqueEmail = `logout-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    const displayName = "Logout User";

    // Signup and login
    await authPage.signup(uniqueEmail, password, displayName);

    // Verify session_preferences exists
    let sessionPrefs = await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      return prefs ? JSON.parse(prefs) : null;
    });
    expect(sessionPrefs).toBeTruthy();

    // Logout
    await authPage.logout();

    // Verify session_preferences is cleared
    sessionPrefs = await page.evaluate(() => {
      return localStorage.getItem("session_preferences");
    });
    expect(sessionPrefs).toBeNull();
  });

  test("should toggle Remember Me checkbox", async ({ page }) => {
    authPage = new AuthPage(page);

    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');

    // Initially unchecked
    await expect(checkbox).not.toBeChecked();

    // Check the checkbox
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Uncheck the checkbox
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("should show timeout message when redirected with timeout query parameter", async ({
    page,
  }) => {
    // Navigate to login page with timeout query parameter
    await page.goto("/login?reason=timeout");

    // Check for timeout message
    const timeoutMessage = page.locator("text=logged out due to inactivity");
    await expect(timeoutMessage).toBeVisible();
  });
});
