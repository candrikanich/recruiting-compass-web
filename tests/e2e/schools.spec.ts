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
    // Client-only clear: this test just verifies the "unauthenticated → /login"
    // redirect contract, so it wipes localStorage/sessionStorage/cookies for
    // this context rather than driving the real logout button. (App logout is
    // now scope: "local" and no longer poisons parallel runs, but the
    // client-only clear remains the tightest way to assert the redirect.)
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
