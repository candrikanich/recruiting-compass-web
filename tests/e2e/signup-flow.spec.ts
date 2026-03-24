import { test, expect } from "@playwright/test";

// Unique suffix per test run to avoid "already registered" collisions
const RUN = Date.now();

test.describe("Signup Page - Full Flow E2E Tests", () => {
  // This spec tests the signup UI — must start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test.describe("Player Signup Flow", () => {
    test("player type selection shows signup form", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');
      await expect(
        page.locator('[data-testid="signup-form-player"]'),
      ).toBeVisible();
    });

    test("should complete full player signup flow with redirect to onboarding", async ({
      page,
    }) => {
      await page.click('[data-testid="user-type-player"]');
      await expect(
        page.locator('[data-testid="signup-form-player"]'),
      ).toBeVisible();

      await page.fill("#firstName", "John");
      await page.fill("#lastName", "Doe");
      await page.fill("#dateOfBirth", "2005-01-15"); // 18+ years old
      await page.fill("#email", `player-e2e-${RUN}@example.com`);
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "SecurePass123");
      await page.check("#agreeToTerms");

      await expect(
        page.locator('[data-testid="signup-button"]'),
      ).not.toBeDisabled();

      await page.click('[data-testid="signup-button"]');
      await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    });

    test("submit button disabled when terms not agreed", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');

      await page.fill("#firstName", "John");
      await page.fill("#lastName", "Doe");
      await page.fill("#dateOfBirth", "2005-01-15");
      await page.fill("#email", "john.nodoe@example.com");
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "SecurePass123");
      // agreeToTerms NOT checked

      await expect(
        page.locator('[data-testid="signup-button"]'),
      ).toBeDisabled();
    });

    test("submit button disabled when dateOfBirth is missing for player", async ({
      page,
    }) => {
      await page.click('[data-testid="user-type-player"]');

      await page.fill("#firstName", "John");
      await page.fill("#lastName", "Doe");
      // dateOfBirth intentionally left blank
      await page.fill("#email", "john.nodob@example.com");
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "SecurePass123");
      await page.check("#agreeToTerms");

      await expect(
        page.locator('[data-testid="signup-button"]'),
      ).toBeDisabled();
    });

    test("COPPA: under-13 player sees age restriction error on submit", async ({
      page,
    }) => {
      await page.click('[data-testid="user-type-player"]');

      await page.fill("#firstName", "Young");
      await page.fill("#lastName", "Player");

      // Set DOB to 10 years ago (under 13)
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      await page.fill("#dateOfBirth", tenYearsAgo.toISOString().split("T")[0]);
      await page.fill("#email", `under13-e2e-${RUN}@example.com`);
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "SecurePass123");
      await page.check("#agreeToTerms");

      await page.click('[data-testid="signup-button"]');

      // COPPA error message
      await expect(
        page.locator("text=not available for users under 13"),
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Parent Signup Flow", () => {
    test("parent type selection shows signup form", async ({ page }) => {
      await page.click('[data-testid="user-type-parent"]');
      await expect(
        page.locator('[data-testid="signup-form-parent"]'),
      ).toBeVisible();
    });

    test("parent form does not show date of birth field", async ({ page }) => {
      await page.click('[data-testid="user-type-parent"]');
      await expect(page.locator("#dateOfBirth")).not.toBeVisible();
    });

    test("should complete parent signup and redirect to parent onboarding", async ({
      page,
    }) => {
      await page.click('[data-testid="user-type-parent"]');
      await expect(
        page.locator('[data-testid="signup-form-parent"]'),
      ).toBeVisible();

      await page.fill("#firstName", "Jane");
      await page.fill("#lastName", "Doe");
      await page.fill("#email", `parent-e2e-${RUN}@example.com`);
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "SecurePass123");
      await page.check("#agreeToTerms");

      await expect(
        page.locator('[data-testid="signup-button"]'),
      ).not.toBeDisabled();

      await page.click('[data-testid="signup-button"]');
      // Parent redirects to /onboarding/parent (not /dashboard or /family-code-entry)
      await expect(page).toHaveURL(/\/onboarding\/parent/, { timeout: 15000 });
    });
  });

  test.describe("Form Validation", () => {
    test("validates email format on blur-sm", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');

      const emailInput = page.locator("#email");
      await emailInput.fill("not-an-email");
      await emailInput.blur();

      await expect(page.locator("#email-error")).toBeVisible();
    });

    test("clears email error when fixed", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');

      const emailInput = page.locator("#email");
      await emailInput.fill("not-an-email");
      await emailInput.blur();
      await expect(page.locator("#email-error")).toBeVisible();

      await emailInput.fill("valid@example.com");
      await emailInput.blur();
      await expect(page.locator("#email-error")).not.toBeVisible();
    });

    test("shows password requirements hint text", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');
      await expect(
        page.locator(
          "text=Must be 8+ characters with uppercase, lowercase, and a number",
        ),
      ).toBeVisible();
    });
  });

  test.describe("User Type Selection", () => {
    test("player form shows date of birth field", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');
      await expect(page.locator("#dateOfBirth")).toBeVisible();
    });

    test("parent form does not show date of birth field", async ({ page }) => {
      await page.click('[data-testid="user-type-parent"]');
      await expect(page.locator("#dateOfBirth")).not.toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("skip link for keyboard navigation is present", async ({ page }) => {
      const skipLink = page.locator('a[href="#signup-form"]');
      await expect(skipLink).toBeAttached();
    });

    test("email field has aria-required attribute", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');
      await expect(page.locator("#email")).toHaveAttribute(
        "aria-required",
        "true",
      );
    });

    test("form heading is present (sr-only) for screen readers", async ({
      page,
    }) => {
      const heading = page.locator("h1");
      await expect(heading).toBeAttached();
    });
  });
});
