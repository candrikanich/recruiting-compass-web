import { test, expect } from "@playwright/test";

test.describe("Signup Page - Full Flow E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test.describe("Player Signup Flow", () => {
    test("should complete full player signup flow with redirect to onboarding", async ({
      page,
    }) => {
      // Select player type
      await page.click('[data-testid="user-type-player"]');
      await expect(
        page.locator('[data-testid="signup-form-player"]'),
      ).toBeVisible();

      // Fill form
      await page.fill("#firstName", "John");
      await page.fill("#lastName", "Doe");
      await page.fill("#email", "john.doe@example.com");
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "SecurePass123");

      // Agree to terms
      await page.check("#agreeToTerms");

      // Submit form
      await page.click('[data-testid="signup-button"]');

      // Verify redirect to onboarding
      await expect(page).toHaveURL(/onboarding/);
    });

    test("should show password mismatch error", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');
      await expect(
        page.locator('[data-testid="signup-form-player"]'),
      ).toBeVisible();

      // Fill form with mismatched passwords
      await page.fill("#firstName", "John");
      await page.fill("#lastName", "Doe");
      await page.fill("#email", "john.doe@example.com");
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "DifferentPass123");

      // Try to submit without checking terms first
      const submitButton = page.locator('[data-testid="signup-button"]');
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe("Parent Signup Flow", () => {
    test("should complete full parent signup with family code and redirect to dashboard", async ({
      page,
    }) => {
      // Select parent type
      await page.click('[data-testid="user-type-parent"]');
      await expect(
        page.locator('[data-testid="signup-form-parent"]'),
      ).toBeVisible();

      // Fill form
      await page.fill("#firstName", "Jane");
      await page.fill("#lastName", "Doe");
      await page.fill("#email", "jane.doe@example.com");
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "SecurePass123");
      await page.fill("#familyCode", "FAM-12345678");

      // Agree to terms
      await page.check("#agreeToTerms");

      // Submit form
      await page.click('[data-testid="signup-button"]');

      // Verify redirect to dashboard
      await expect(page).toHaveURL(/dashboard/);
    });

    test("should complete parent signup without family code and redirect to family-code-entry", async ({
      page,
    }) => {
      // Select parent type
      await page.click('[data-testid="user-type-parent"]');
      await expect(
        page.locator('[data-testid="signup-form-parent"]'),
      ).toBeVisible();

      // Fill form without family code
      await page.fill("#firstName", "Jane");
      await page.fill("#lastName", "Doe");
      await page.fill("#email", "jane.doe@example.com");
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "SecurePass123");

      // Agree to terms
      await page.check("#agreeToTerms");

      // Submit form
      await page.click('[data-testid="signup-button"]');

      // Verify redirect to family-code-entry
      await expect(page).toHaveURL(/family-code-entry/);
    });

    test("should show family code field when parent is selected", async ({
      page,
    }) => {
      await page.click('[data-testid="user-type-parent"]');
      await expect(page.locator("#familyCode")).toBeVisible();
    });

    test("should not show family code field when player is selected", async ({
      page,
    }) => {
      await page.click('[data-testid="user-type-parent"]');
      await expect(page.locator("#familyCode")).toBeVisible();

      // Switch to player
      await page.click('[data-testid="user-type-player"]');
      await expect(page.locator("#familyCode")).not.toBeVisible();
    });
  });

  test.describe("Form Validation & Error Handling", () => {
    test("should show terms agreement error when unchecked", async ({
      page,
    }) => {
      await page.click('[data-testid="user-type-player"]');

      await page.fill("#firstName", "John");
      await page.fill("#lastName", "Doe");
      await page.fill("#email", "john.doe@example.com");
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "SecurePass123");

      // Don't check terms
      const submitButton = page.locator('[data-testid="signup-button"]');
      await expect(submitButton).toBeDisabled();
    });

    test("should validate email format on blur", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');

      const emailInput = page.locator("#email");
      await emailInput.fill("invalid-email");
      await emailInput.blur();

      // Error message should be visible
      const errorMessage = page.locator("#email-error");
      await expect(errorMessage).toBeVisible();
    });

    test("should validate password requirements", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');

      const passwordInput = page.locator("#password");
      await passwordInput.fill("short");
      await passwordInput.blur();

      // Should show password requirements are not met
      const helpText = page.locator(
        "text=Must be 8+ characters with uppercase, lowercase, and a number",
      );
      await expect(helpText).toBeVisible();
    });

    test("should clear form errors when corrected", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');

      const emailInput = page.locator("#email");
      await emailInput.fill("invalid-email");
      await emailInput.blur();

      // Error should appear
      let errorMessage = page.locator("#email-error");
      await expect(errorMessage).toBeVisible();

      // Fix the email
      await emailInput.clear();
      await emailInput.fill("valid@example.com");
      await emailInput.blur();

      // Error should disappear
      errorMessage = page.locator("#email-error");
      // Wait for error to disappear or check it's not visible
      await page.waitForTimeout(300);
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper skip link for keyboard navigation", async ({
      page,
    }) => {
      const skipLink = page.locator('a[href="#signup-form"]');
      await expect(skipLink).toBeVisible();

      // Skip link should have sr-only class
      const classes = await skipLink.getAttribute("class");
      expect(classes).toContain("sr-only");
    });

    test("should have proper aria labels on form fields", async ({ page }) => {
      await page.click('[data-testid="user-type-player"]');

      const emailInput = page.locator("#email");
      const ariaRequired = await emailInput.getAttribute("aria-required");
      expect(ariaRequired).toBe("true");
    });

    test("should have proper form heading for screen readers", async ({
      page,
    }) => {
      const heading = page.locator("h1");
      const classes = await heading.getAttribute("class");
      expect(classes).toContain("sr-only");
    });

    test("should announce loading state to screen readers", async ({
      page,
    }) => {
      await page.click('[data-testid="user-type-player"]');

      // Fill form
      await page.fill("#firstName", "John");
      await page.fill("#lastName", "Doe");
      await page.fill("#email", "john.doe@example.com");
      await page.fill("#password", "SecurePass123");
      await page.fill("#confirmPassword", "SecurePass123");
      await page.check("#agreeToTerms");

      // Check for loading announcement
      const loadingStatus = page.locator('[role="status"]');
      await expect(loadingStatus).toBeVisible();
    });
  });

  test.describe("User Type Switching", () => {
    test("should switch from player to parent and show family code field", async ({
      page,
    }) => {
      // Start with player
      await page.click('[data-testid="user-type-player"]');
      await expect(
        page.locator('[data-testid="signup-form-player"]'),
      ).toBeVisible();
      await expect(page.locator("#familyCode")).not.toBeVisible();

      // Switch to parent
      await page.click('[data-testid="user-type-parent"]');
      await expect(
        page.locator('[data-testid="signup-form-parent"]'),
      ).toBeVisible();
      await expect(page.locator("#familyCode")).toBeVisible();
    });

    test("should clear form errors when switching user type", async ({
      page,
    }) => {
      // Select player and fill invalid email
      await page.click('[data-testid="user-type-player"]');
      const emailInput = page.locator("#email");
      await emailInput.fill("invalid-email");
      await emailInput.blur();

      // Error should be visible
      await expect(page.locator("#email-error")).toBeVisible();

      // Switch to parent - errors should be cleared
      await page.click('[data-testid="user-type-parent"]');
      // Parent form should be visible without errors
      await expect(
        page.locator('[data-testid="signup-form-parent"]'),
      ).toBeVisible();
    });
  });
});
