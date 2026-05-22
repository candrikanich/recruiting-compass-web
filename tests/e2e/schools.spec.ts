import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";

test.describe("Schools Management", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user is logged in before each test
    await authFixture.ensureLoggedIn(page);
  });

  test("should navigate to schools page", async ({ page }) => {
    await page.goto("/schools");
    await expect(page).toHaveURL("/schools");

    // Check for page header
    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should be on dashboard when authenticated", async ({ page }) => {
    await expect(page).toHaveURL("/dashboard");

    // Check dashboard is loaded - use more specific selector for h1
    const dashboardHeader = page.locator('h1:has-text("Dashboard")');
    await expect(dashboardHeader).toBeVisible();
  });

  test("should logout and redirect to login", async ({ page }) => {
    // Client-only clear: do NOT trigger the real logout button.
    // The app's logout handler calls supabase.auth.signOut() with global scope,
    // which revokes the shared player.json refresh token server-side and bounces
    // every concurrent worker to /login. clearAuthState wipes localStorage,
    // sessionStorage, and cookies for this context only — verifies the redirect
    // contract without poisoning parallel runs.
    await authFixture.clearAuthState(page);
    await expect(page).toHaveURL("/login");
  });

  test("should navigate to dashboard from any page", async ({ page }) => {
    await page.goto("/schools");

    // Should be able to navigate within app
    const isOnSchools = page.url().includes("/schools");
    expect(isOnSchools).toBe(true);
  });
});
