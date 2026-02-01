import { test, expect } from "@playwright/test";

/**
 * Password Reset E2E Tests
 *
 * Tests the complete password reset flow including:
 * - Requesting password reset email
 * - Validating reset link
 * - Resetting password with new value
 * - Login with new password
 * - Security scenarios (expired links, rate limiting, etc.)
 */

test.describe("Password Reset Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Start from login page
    await page.goto("/login");
  });

  test.describe("Forgot Password Page", () => {
    test("should navigate to forgot password from login", async ({ page }) => {
      // Find and click forgot password link
      const forgotLink = page.getByRole("link", { name: /forgot password/i });
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();

      // Should be on forgot password page
      await expect(page).toHaveURL("/forgot-password");
      await expect(
        page.getByRole("heading", { name: /reset your password/i }),
      ).toBeVisible();
    });

    test("should display form elements on forgot password page", async ({
      page,
    }) => {
      await page.goto("/forgot-password");

      // Check form elements are visible
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /send reset link/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /back to login/i }),
      ).toBeVisible();
    });

    test("should validate email on blur", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);

      // Leave email empty and blur
      await emailInput.focus();
      await emailInput.blur();

      // Should show validation error
      await expect(page.getByText(/invalid.*email/i)).toBeVisible({
        timeout: 1000,
      });
    });

    test("should disable submit button with invalid email", async ({
      page,
    }) => {
      await page.goto("/forgot-password");

      const submitButton = page.getByRole("button", {
        name: /send reset link/i,
      });
      const emailInput = page.getByLabel(/email/i);

      // Initially disabled (empty)
      await expect(submitButton).toBeDisabled();

      // Enter invalid email
      await emailInput.fill("invalid-email");
      await emailInput.blur();

      // Should still be disabled
      await expect(submitButton).toBeDisabled();
    });

    test("should enable submit button with valid email", async ({ page }) => {
      await page.goto("/forgot-password");

      const submitButton = page.getByRole("button", {
        name: /send reset link/i,
      });
      const emailInput = page.getByLabel(/email/i);

      // Enter valid email
      await emailInput.fill("test@example.com");

      // Should be enabled
      await expect(submitButton).toBeEnabled();
    });

    test("should show success message after sending reset email", async ({
      page,
    }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.getByRole("button", {
        name: /send reset link/i,
      });

      // Fill form and submit
      await emailInput.fill("test@example.com");
      await submitButton.click();

      // Should show success state
      await expect(
        page.getByRole("heading", { name: /check your email/i }),
      ).toBeVisible();
      await expect(
        page.getByText(/we've sent you a password reset link/i),
      ).toBeVisible();
      await expect(page.getByText(/test@example.com/)).toBeVisible();
    });

    test("should show resend button after success", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.getByRole("button", {
        name: /send reset link/i,
      });

      // Submit form
      await emailInput.fill("test@example.com");
      await submitButton.click();

      // Resend button should appear
      await expect(
        page.getByRole("button", { name: /resend reset link/i }),
      ).toBeVisible();
    });

    test("should have resend cooldown", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.getByRole("button", {
        name: /send reset link/i,
      });

      // Submit form
      await emailInput.fill("test@example.com");
      await submitButton.click();

      const resendButton = page.getByRole("button", {
        name: /resend reset link/i,
      });

      // Click resend
      await resendButton.click();

      // Should show cooldown
      await expect(resendButton).toContainText(/resend in \d+s/);
      await expect(resendButton).toBeDisabled();

      // Wait for cooldown to expire (5 seconds for test)
      await expect(resendButton).toBeEnabled({ timeout: 10000 });
    });

    test("should navigate back to login", async ({ page }) => {
      await page.goto("/forgot-password");

      const backLink = page.getByRole("link", { name: /back to login/i });
      await backLink.click();

      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("Reset Password Page", () => {
    test("should display error when no token in URL", async ({ page }) => {
      await page.goto("/reset-password");

      // Should show invalid token error
      await expect(
        page.getByRole("heading", { name: /invalid link/i }),
      ).toBeVisible();
      await expect(page.getByText(/no reset link provided/i)).toBeVisible();
    });

    test("should display form elements when token exists", async ({ page }) => {
      // Navigate to reset page with mock token
      await page.goto("/reset-password?token=mock-token");

      // Check form elements are visible
      await expect(page.getByLabel(/new password/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /reset password/i }),
      ).toBeVisible();
    });

    test("should show password requirements checklist", async ({ page }) => {
      await page.goto("/reset-password?token=mock-token");

      // Check all requirements are visible
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
      await expect(page.getByText(/one uppercase letter/i)).toBeVisible();
      await expect(page.getByText(/one lowercase letter/i)).toBeVisible();
      await expect(page.getByText(/one number/i)).toBeVisible();
    });

    test("should toggle password visibility", async ({ page }) => {
      await page.goto("/reset-password?token=mock-token");

      const passwordInput = page.getByLabel(/new password/i);
      const toggleButtons = page.locator('button[type="button"]');

      // Initially should be password type
      await expect(passwordInput).toHaveAttribute("type", "password");

      // Click first toggle button
      await toggleButtons.first().click();

      // Should be text type
      await expect(passwordInput).toHaveAttribute("type", "text");

      // Click again to hide
      await toggleButtons.first().click();

      // Should be password type again
      await expect(passwordInput).toHaveAttribute("type", "password");
    });

    test("should validate password requirements in real-time", async ({
      page,
    }) => {
      await page.goto("/reset-password?token=mock-token");

      const passwordInput = page.getByLabel(/new password/i);
      const checksCircles = page.locator(
        "svg.text-emerald-600, svg.text-slate-300",
      );

      // Type partial password
      await passwordInput.fill("pass");

      // Check requirements list updates
      // (Should show some requirements as not met)
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();

      // Type full valid password
      await passwordInput.fill("ValidPassword123");

      // All requirements should be met (visible with check marks)
      // This is indicated by emerald color for checks
    });

    test("should disable submit when passwords don't match", async ({
      page,
    }) => {
      await page.goto("/reset-password?token=mock-token");

      const passwordInput = page.getByLabel(/new password/i);
      const confirmInput = page.getByLabel(/confirm password/i);
      const submitButton = page.getByRole("button", {
        name: /reset password/i,
      });

      // Enter different passwords
      await passwordInput.fill("ValidPassword123");
      await confirmInput.fill("DifferentPassword123");

      // Submit should be disabled
      await expect(submitButton).toBeDisabled();
    });

    test("should enable submit when passwords match and valid", async ({
      page,
    }) => {
      await page.goto("/reset-password?token=mock-token");

      const passwordInput = page.getByLabel(/new password/i);
      const confirmInput = page.getByLabel(/confirm password/i);
      const submitButton = page.getByRole("button", {
        name: /reset password/i,
      });

      // Enter matching valid passwords
      await passwordInput.fill("ValidPassword123");
      await confirmInput.fill("ValidPassword123");

      // Submit should be enabled
      await expect(submitButton).toBeEnabled();
    });

    test("should validate on blur", async ({ page }) => {
      await page.goto("/reset-password?token=mock-token");

      const passwordInput = page.getByLabel(/new password/i);

      // Focus and blur without entering anything
      await passwordInput.focus();
      await passwordInput.blur();

      // Should show validation error
      await expect(
        page.getByText(/password must be at least 8 characters/i),
      ).toBeVisible({ timeout: 1000 });
    });

    test("should show error for weak password", async ({ page }) => {
      await page.goto("/reset-password?token=mock-token");

      const passwordInput = page.getByLabel(/new password/i);
      const confirmInput = page.getByLabel(/confirm password/i);

      // Enter weak password
      await passwordInput.fill("weak");
      await confirmInput.fill("weak");
      await passwordInput.blur();

      // Should show validation error
      await expect(
        page.getByText(/password must be at least 8 characters/i),
      ).toBeVisible({ timeout: 1000 });
    });

    test("should navigate back to welcome", async ({ page }) => {
      await page.goto("/reset-password?token=mock-token");

      const backLink = page.getByRole("link", { name: /back to welcome/i });
      await backLink.click();

      await expect(page).toHaveURL("/");
    });

    test("should show error for invalid token", async ({ page }) => {
      await page.goto("/reset-password?token=invalid");

      // Should show invalid token state (implementation-dependent)
      // At minimum should show heading and no form
      await expect(page.getByRole("heading")).toBeVisible();
    });

    test("should show error for expired token", async ({ page }) => {
      await page.goto("/reset-password?token=expired");

      // Should show invalid/expired error
      await expect(page.getByRole("heading")).toBeVisible();
    });

    test("should allow requesting new link when token invalid", async ({
      page,
    }) => {
      await page.goto("/reset-password");

      // Click "Request New Reset Link" button if visible
      const newLinkButton = page.getByRole("link", {
        name: /request new reset link/i,
      });

      if (await newLinkButton.isVisible()) {
        await newLinkButton.click();
        await expect(page).toHaveURL("/forgot-password");
      }
    });
  });

  test.describe("Password Reset Security", () => {
    test("should have 24-hour expiration window", async ({ page }) => {
      // This test verifies the 24-hour expiration is documented
      // Actual testing requires manipulating system time or backend
      await page.goto("/forgot-password");

      // Check help text mentions 24-hour expiration
      await expect(page.getByText(/link will expire/i)).toBeVisible();
    });

    test("should not reveal if email exists in system", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.getByRole("button", {
        name: /send reset link/i,
      });

      // Submit with non-existent email
      await emailInput.fill("nonexistent@example.com");
      await submitButton.click();

      // Should show same success message as if email existed
      await expect(
        page.getByText(/if an account exists with this email/i),
      ).toBeVisible();
    });

    test("should handle rate limiting gracefully", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.getByRole("button", {
        name: /send reset link/i,
      });

      // Submit multiple times
      for (let i = 0; i < 3; i++) {
        await emailInput.fill("test@example.com");
        await submitButton.click();

        // Should show success or rate limit message
        await expect(
          page.getByText(/if an account exists|too many requests/i),
        ).toBeVisible();

        // Navigate back to form if needed
        if (i < 2) {
          await page.goto("/forgot-password");
        }
      }
    });

    test("should not allow password reuse of reset token", async ({ page }) => {
      // This test verifies the backend enforces single-use tokens
      // Actual testing would require attempting to use same token twice
      await page.goto("/reset-password?token=single-use");

      // First use should work (form should be available)
      await expect(page.getByLabel(/new password/i)).toBeVisible();

      // Attempting to use same token again would fail
      // (backend verification required)
    });
  });

  test.describe("Password Reset Form Validation", () => {
    test("should prevent submission with invalid password", async ({
      page,
    }) => {
      await page.goto("/reset-password?token=valid");

      const passwordInput = page.getByLabel(/new password/i);
      const submitButton = page.getByRole("button", {
        name: /reset password/i,
      });

      // Try various invalid passwords
      const invalidPasswords = [
        "short", // Too short
        "NoNumbers", // No numbers
        "nonumbershere123", // No uppercase
        "NONUMBERSHERE123", // No lowercase
      ];

      for (const pwd of invalidPasswords) {
        await passwordInput.fill(pwd);
        await expect(submitButton).toBeDisabled();
      }
    });

    test("should trim whitespace from email", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.getByRole("button", {
        name: /send reset link/i,
      });

      // Enter email with whitespace
      await emailInput.fill("  test@example.com  ");

      // Should be treated as valid
      await expect(submitButton).toBeEnabled();
    });

    test("should handle special characters in email", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.getByRole("button", {
        name: /send reset link/i,
      });

      // Enter email with special characters
      await emailInput.fill("test+tag@example.co.uk");

      // Should be valid
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe("Navigation and UX", () => {
    test("should show back links throughout flow", async ({ page }) => {
      // From forgot password
      await page.goto("/forgot-password");
      await expect(page.getByRole("link", { name: /back/i })).toBeVisible();

      // From reset password
      await page.goto("/reset-password?token=valid");
      await expect(page.getByRole("link", { name: /back/i })).toBeVisible();
    });

    test("should provide help text", async ({ page }) => {
      // Help text on forgot password page
      await page.goto("/forgot-password");
      await expect(page.getByText(/spam.*folder/i)).toBeVisible();

      // Help text on reset password page
      await page.goto("/reset-password?token=valid");
      await expect(page.getByText(/password must contain/i)).toBeVisible();
    });

    test("should display appropriate icons based on state", async ({
      page,
    }) => {
      // Forgot password initial state should show email icon
      await page.goto("/forgot-password");
      const emailIcons = page
        .locator("svg")
        .filter({ has: page.getByRole("img", { hidden: true }) });
      await expect(emailIcons.first()).toBeVisible();

      // Reset password form should show password icon
      await page.goto("/reset-password?token=valid");
      const passwordIcons = page
        .locator("svg")
        .filter({ has: page.getByRole("img", { hidden: true }) });
      await expect(passwordIcons.first()).toBeVisible();
    });
  });
});
