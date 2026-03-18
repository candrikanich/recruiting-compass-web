import { Page, expect } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { testUsers } from "./testData";
import { TEST_ACCOUNTS, type TestAccountType } from "../config/test-accounts";

/**
 * Auth fixture for E2E tests
 * Handles login, logout, and auth state cleanup
 */
export const authFixture = {
  /**
   * Clear all auth state from browser
   */
  async clearAuthState(page: Page) {
    // Navigate to login page to establish context (avoids Pinia errors on homepage)
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Also clear any Supabase auth data if available
      if (window.localStorage.getItem("supabase.auth.token")) {
        window.localStorage.removeItem("supabase.auth.token");
      }
      if (window.localStorage.getItem("supabase.auth.refreshToken")) {
        window.localStorage.removeItem("supabase.auth.refreshToken");
      }
    });

    // Clear all cookies including httpOnly
    await page.context().clearCookies();

    // Navigate to login to ensure fresh state
    await page.goto("/login");
    await page.waitForURL("/login", { timeout: 5000 }).catch(() => {
      // Already on /login or another page — that's fine
    });
  },

  /**
   * Login with existing credentials (creates user if doesn't exist)
   */
  async loginOrSignup(
    page: Page,
    email: string,
    password: string,
    displayName: string,
  ) {
    const authPage = new AuthPage(page);

    // Go to login page
    await authPage.goto();

    // Try login first
    try {
      await authPage.login(email, password);
      return { email, password, displayName };
    } catch {
      // If login fails, try signup
      await authPage.goto();
      await authPage.signup(email, password, displayName);
      return { email, password, displayName };
    }
  },

  /**
   * Signup with fresh test user
   */
  async signupNewUser(page: Page) {
    const authPage = new AuthPage(page);
    const email = `test-${Date.now()}@example.com`;
    const password = "TestPassword123!";
    const displayName = "Test User";

    await authPage.goto();
    await authPage.signup(email, password, displayName);

    // After signup the app redirects to onboarding/verify-email.
    // Navigate directly to dashboard — the session is active even before email verification.
    // Try to access dashboard directly - if session is valid, we'll be allowed
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    // If we're still on verify-email, wait a moment and try again
    if (page.url().includes("/verify-email")) {
      // For testing, skip email verification by going to dashboard
      // The session should already be active even if email isn't verified
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    }

    return { email, password, displayName };
  },

  /**
   * Login with test user
   */
  async loginAsTestUser(page: Page) {
    const authPage = new AuthPage(page);

    await authPage.goto();
    await authPage.login(testUsers.newUser.email, testUsers.newUser.password);

    return testUsers.newUser;
  },

  /**
   * Check if user is logged in
   */
  async isLoggedIn(page: Page): Promise<boolean> {
    try {
      const response = await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
      });
      // If redirected to login, not logged in
      return !page.url().includes("/login") && response?.status() !== 401;
    } catch {
      return false;
    }
  },

  /**
   * Ensure user is logged in (login if not already)
   */
  async ensureLoggedIn(
    page: Page,
    email?: string,
    password?: string,
    displayName?: string,
  ) {
    const isLoggedIn = await authFixture.isLoggedIn(page);

    if (!isLoggedIn) {
      if (email && password && displayName) {
        await authFixture.loginOrSignup(page, email, password, displayName);
      } else {
        await authFixture.signupNewUser(page);
      }
    }

    // Verify we're on dashboard
    await expect(page).toHaveURL("/dashboard");
  },

  /**
   * Logout and verify redirect to login
   */
  async logout(page: Page) {
    const authPage = new AuthPage(page);

    try {
      await authPage.logout();
    } catch {
      // If logout UI fails, clear auth state manually
      await authFixture.clearAuthState(page);
      await page.goto("/login");
    }

    await authPage.expectLoginPage();
  },

  /**
   * Fast login using pre-captured storageState from global setup (< 1 second).
   * Loads .auth/{accountType}.json and injects cookies + localStorage into the page context.
   */
  async loginFast(page: Page, accountType: TestAccountType = "player") {
    const account = TEST_ACCOUNTS[accountType];
    const { readFile } = await import("fs/promises");
    const { resolve } = await import("path");
    const authFilePath = resolve(process.cwd(), `tests/e2e/.auth/${accountType}.json`);

    try {
      const stateJson = await readFile(authFilePath, "utf-8");
      const state = JSON.parse(stateJson);

      // Apply cookies first
      await page.context().clearCookies();
      if (state.cookies?.length) {
        await page.context().addCookies(state.cookies);
      }

      // Navigate to app to establish the origin before injecting localStorage
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Inject localStorage items (Supabase auth tokens live here)
      for (const origin of state.origins ?? []) {
        for (const item of origin.localStorage ?? []) {
          await page.evaluate(
            ([key, value]) => localStorage.setItem(key, value),
            [item.name, item.value] as [string, string],
          );
        }
      }

      // Navigate to dashboard to confirm auth
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

      return account;
    } catch (error) {
      throw new Error(
        `loginFast(${accountType}) failed — ensure global setup has run and .auth/${accountType}.json exists`,
      );
    }
  },
};
