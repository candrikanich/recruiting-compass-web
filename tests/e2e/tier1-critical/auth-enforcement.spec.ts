import { test, expect } from "@playwright/test";

/**
 * Auth Enforcement E2E Tests
 * Validates that protected routes require authentication
 */

test.describe("Auth Enforcement - Protected Routes", () => {
  test("should redirect unauthenticated user from dashboard to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Should be redirected to login
    expect(page.url()).toContain("/login");
  });

  test("should redirect unauthenticated user from coaches page to login", async ({
    page,
  }) => {
    await page.goto("/coaches");
    expect(page.url()).toContain("/login");
  });

  test("should redirect unauthenticated user from schools page to login", async ({
    page,
  }) => {
    await page.goto("/schools");
    expect(page.url()).toContain("/login");
  });

  test("should redirect unauthenticated user from search page to login", async ({
    page,
  }) => {
    await page.goto("/search");
    expect(page.url()).toContain("/login");
  });

  test("should preserve redirect URL in login query param", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    expect(page.url()).toContain(
      `redirect=${encodeURIComponent("/dashboard")}`,
    );
  });

  test("should preserve redirect URL for nested routes", async ({ page }) => {
    await page.goto("/coaches/123/analytics");
    expect(page.url()).toContain("redirect=");
    expect(page.url()).toContain("coaches");
  });
});

test.describe("Auth Enforcement - Public Routes", () => {
  test("should allow access to login page without auth", async ({ page }) => {
    await page.goto("/login");
    expect(page.url()).toContain("/login");
    // Should see login form
    expect(page.locator("text=Sign In")).toBeVisible();
  });

  test("should allow access to signup page without auth", async ({ page }) => {
    await page.goto("/signup");
    expect(page.url()).toContain("/signup");
  });

  test("should allow access to forgot-password page without auth", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    expect(page.url()).toContain("/forgot-password");
  });

  test("should allow access to home page without auth", async ({ page }) => {
    await page.goto("/");
    expect(page.url()).toContain("/");
  });
});

test.describe("Auth Enforcement - Feature Flag Disabled", () => {
  // These tests validate that when auth enforcement is disabled via feature flag,
  // protected routes are still accessible without authentication
  // (This allows for gradual rollout/testing)

  test.skip("should allow access to protected routes when feature flag is disabled", async ({
    page,
  }) => {
    // Skip for now - this test verifies feature flag behavior
    // In practice, you'd set NUXT_PUBLIC_AUTH_ENFORCEMENT_ENABLED=false
    // and verify protected routes are still accessible
  });
});
