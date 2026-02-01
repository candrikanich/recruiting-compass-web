import { test, expect } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { authFixture } from "../fixtures/auth.fixture";

test.describe("Tier 1: Session Timeout - Warning and Logout", () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authFixture.clearAuthState(page);
    await authPage.goto();
  });

  test("should not show warning modal for users without Remember Me", async ({
    page,
  }) => {
    authPage = new AuthPage(page);

    // Create a unique test user
    const uniqueEmail = `no-remember-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    const displayName = "No Remember Me User";

    // Signup without Remember Me
    await authPage.signup(uniqueEmail, password, displayName);
    await authPage.logout();
    await authPage.expectLoginPage();

    // Login without Remember Me
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await expect(checkbox).not.toBeChecked();
    await authPage.login(uniqueEmail, password);

    // Wait for page to load
    await page.waitForURL(/\/(dashboard|verify-email)/);

    // Verify warning modal is NOT visible
    const warningModal = page.locator("text=Session Timeout Warning");
    await expect(warningModal).not.toBeVisible();
  });

  test("should display warning modal after extended inactivity for Remember Me users", async ({
    page,
  }) => {
    authPage = new AuthPage(page);

    // Create a unique test user
    const uniqueEmail = `session-warning-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    const displayName = "Session Warning User";

    // Signup with Remember Me
    await authPage.signup(uniqueEmail, password, displayName);
    await authPage.logout();
    await authPage.expectLoginPage();

    // Check Remember Me and login
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await checkbox.check();
    await authPage.login(uniqueEmail, password);

    // Wait for page to load
    await page.waitForURL(/\/(dashboard|verify-email)/);

    // Simulate near-timeout by manipulating localStorage
    await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        // Set lastActivity to 29 days + 56 minutes ago (4 minutes until timeout)
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        parsed.lastActivity = Date.now() - (thirtyDays - 4 * 60 * 1000);
        localStorage.setItem("session_preferences", JSON.stringify(parsed));
      }
    });

    // Navigate to any page to trigger middleware check
    await page.goto("/dashboard");

    // Wait for warning modal to appear (may need to wait a bit)
    const warningModal = page.locator("text=Session Timeout Warning");
    await expect(warningModal).toBeVisible({ timeout: 5000 });

    // Verify warning content
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
    authPage = new AuthPage(page);

    // Create a unique test user
    const uniqueEmail = `stay-logged-in-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    const displayName = "Stay Logged In User";

    // Signup with Remember Me
    await authPage.signup(uniqueEmail, password, displayName);
    await authPage.logout();
    await authPage.expectLoginPage();

    // Check Remember Me and login
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await checkbox.check();
    await authPage.login(uniqueEmail, password);

    // Wait for page to load
    await page.waitForURL(/\/(dashboard|verify-email)/);

    // Get original lastActivity
    const originalPrefs = await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      return prefs ? JSON.parse(prefs) : null;
    });
    const originalLastActivity = originalPrefs.lastActivity;

    // Simulate near-timeout
    await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        parsed.lastActivity = Date.now() - (thirtyDays - 4 * 60 * 1000);
        localStorage.setItem("session_preferences", JSON.stringify(parsed));
      }
    });

    // Navigate to trigger warning
    await page.goto("/dashboard");

    // Wait for warning modal
    const warningModal = page.locator("text=Session Timeout Warning");
    await expect(warningModal).toBeVisible({ timeout: 5000 });

    // Click "Stay Logged In"
    const stayButton = page.locator('button:has-text("Stay Logged In")');
    await stayButton.click();

    // Warning should be dismissed
    await expect(warningModal).not.toBeVisible();

    // Verify lastActivity has been updated
    const updatedPrefs = await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      return prefs ? JSON.parse(prefs) : null;
    });
    expect(updatedPrefs.lastActivity).toBeGreaterThan(originalLastActivity);
  });

  test('should logout when "Logout Now" button is clicked', async ({
    page,
  }) => {
    authPage = new AuthPage(page);

    // Create a unique test user
    const uniqueEmail = `logout-now-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    const displayName = "Logout Now User";

    // Signup with Remember Me
    await authPage.signup(uniqueEmail, password, displayName);
    await authPage.logout();
    await authPage.expectLoginPage();

    // Check Remember Me and login
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await checkbox.check();
    await authPage.login(uniqueEmail, password);

    // Wait for page to load
    await page.waitForURL(/\/(dashboard|verify-email)/);

    // Simulate near-timeout
    await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        parsed.lastActivity = Date.now() - (thirtyDays - 4 * 60 * 1000);
        localStorage.setItem("session_preferences", JSON.stringify(parsed));
      }
    });

    // Navigate to trigger warning
    await page.goto("/dashboard");

    // Wait for warning modal
    const warningModal = page.locator("text=Session Timeout Warning");
    await expect(warningModal).toBeVisible({ timeout: 5000 });

    // Click "Logout Now"
    const logoutButton = page.locator('button:has-text("Logout Now")');
    await logoutButton.click();

    // Should be redirected to login page with timeout reason
    await page.waitForURL("/login?reason=timeout");

    // Verify session_preferences is cleared
    const sessionPrefs = await page.evaluate(() => {
      return localStorage.getItem("session_preferences");
    });
    expect(sessionPrefs).toBeNull();
  });

  test("should show timeout message when accessing app after session expiry", async ({
    page,
  }) => {
    authPage = new AuthPage(page);

    // Create a unique test user
    const uniqueEmail = `expired-session-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    const displayName = "Expired Session User";

    // Signup with Remember Me
    await authPage.signup(uniqueEmail, password, displayName);
    await authPage.logout();
    await authPage.expectLoginPage();

    // Check Remember Me and login
    const checkbox = page.locator('[data-testid="remember-me-checkbox"]');
    await checkbox.check();
    await authPage.login(uniqueEmail, password);

    // Wait for page to load
    await page.waitForURL(/\/(dashboard|verify-email)/);

    // Simulate expired session
    await page.evaluate(() => {
      const prefs = localStorage.getItem("session_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        // Set lastActivity to 31+ days ago
        parsed.lastActivity = Date.now() - 31 * 24 * 60 * 60 * 1000;
        localStorage.setItem("session_preferences", JSON.stringify(parsed));
      }
    });

    // Navigate to any page - middleware should detect expired session
    await page.goto("/dashboard");

    // Should be redirected to login with timeout reason
    await page.waitForURL("/login?reason=timeout");

    // Verify timeout message is displayed
    const timeoutMessage = page.locator("text=logged out due to inactivity");
    await expect(timeoutMessage).toBeVisible();

    // Verify session_preferences is cleared
    const sessionPrefs = await page.evaluate(() => {
      return localStorage.getItem("session_preferences");
    });
    expect(sessionPrefs).toBeNull();
  });
});
