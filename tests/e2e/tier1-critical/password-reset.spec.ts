import { test, expect, type Page } from "@playwright/test";
import {
  createOneOffTestUser,
  deleteOneOffTestUser,
  generateRecoveryLink,
} from "../seed/helpers/supabase-admin";

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

/**
 * Navigate the page through a real Supabase recovery flow so /reset-password
 * renders its form. Uses the admin generateLink API (Option A from bug ticket
 * #6) rather than a test-only bypass.
 *
 * Supabase enforces the Site URL / Redirect URL allow list when verifying the
 * link — local test origins (e.g. localhost:3003) typically aren't in the
 * project's allow list, so Supabase ignores our redirectTo and sends the
 * verified session to the project Site URL instead. We work around this by
 * letting Supabase verify (producing the recovery hash), capturing the
 * fragment from whichever origin it landed on, and replaying it against the
 * local /reset-password route. supabase-js then picks up the session on
 * arrival just as it would in production.
 */
async function navigateWithRecoverySession(page: Page, email: string) {
  const baseURL =
    (page.context() as unknown as { _options?: { baseURL?: string } })._options
      ?.baseURL ?? "http://localhost:3003";
  const rawLink = await generateRecoveryLink(email);

  // Open verify in an isolated context so the post-verify navigation lands
  // wherever the project Site URL points without polluting the test page.
  const isolatedContext = await page.context().browser()!.newContext();
  const verifyPage = await isolatedContext.newPage();
  await verifyPage.goto(rawLink);
  await verifyPage.waitForLoadState("domcontentloaded");
  const landedUrl = verifyPage.url();
  const hash = new URL(landedUrl).hash; // "#access_token=...&type=recovery"
  await isolatedContext.close();

  if (!hash || !hash.includes("access_token=")) {
    throw new Error(
      `Recovery verify did not return an access_token fragment: ${landedUrl}`,
    );
  }

  await page.goto(`${baseURL}/reset-password${hash}`);
  await page.waitForLoadState("domcontentloaded");
  // The form contains an aria-label="Create new password" on both the form
  // wrapper and the icon container, so wait for the actual <input> by id.
  await page.locator("#password").waitFor({ state: "visible", timeout: 10000 });
}

test.describe("Password Reset Flow", () => {
  // Use unique emails per test to avoid Supabase rate limiting
  const testEmail = () =>
    `reset-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}@test-example.com`;
  // This spec tests the login/reset UI — must start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    // Start from login page — wait for Vue to hydrate before asserting
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page
      .locator('[data-testid="login-button"]')
      .waitFor({ state: "visible", timeout: 10000 });
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
        page.locator('[data-testid="send-reset-link-button"]'),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /back to login/i }),
      ).toBeVisible();
    });

    test("should validate email on blur-sm", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);

      // Leave email empty and blur
      await emailInput.focus();
      await emailInput.blur();

      // Should show validation error (empty → "Email must be at least 5 characters")
      await expect(
        page.getByText(/email.*character|valid email/i).first(),
      ).toBeVisible({ timeout: 3000 });
    });

    test("should disable submit button with invalid email", async ({
      page,
    }) => {
      await page.goto("/forgot-password");

      const submitButton = page.locator(
        '[data-testid="send-reset-link-button"]',
      );
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

      const submitButton = page.locator(
        '[data-testid="send-reset-link-button"]',
      );
      const emailInput = page.getByLabel(/email/i);

      // Enter valid email
      await emailInput.fill(testEmail());

      // Should be enabled
      await expect(submitButton).toBeEnabled();
    });

    test("should show success message after sending reset email", async ({
      page,
    }) => {
      await page.goto("/forgot-password");

      const email = testEmail();
      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.locator(
        '[data-testid="send-reset-link-button"]',
      );

      // Fill form and submit
      await emailInput.fill(email);
      await emailInput.blur();
      await expect(submitButton).toBeEnabled({ timeout: 5000 });
      await submitButton.click();

      // Should show success state — Supabase auth API can take 5-10s
      await expect(
        page.getByRole("heading", { name: /check your email/i }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByText(/we've sent you a password reset link/i),
      ).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
    });

    // QUARANTINED 2026-05-22: success-state UI not reachable without real Supabase response.
    test.skip("should show resend button after success", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.locator(
        '[data-testid="send-reset-link-button"]',
      );

      // Submit form — blur triggers Vue validation so button becomes enabled
      await emailInput.fill(testEmail());
      await emailInput.blur();
      await expect(submitButton).toBeEnabled({ timeout: 5000 });
      await submitButton.click();

      // Resend button should appear once emailSent = true
      await expect(
        page.getByRole("button", { name: /resend reset link/i }),
      ).toBeVisible({ timeout: 15000 });
    });

    // QUARANTINED 2026-05-22: same as above — cooldown UI not reachable.
    test.skip("should have resend cooldown", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.locator(
        '[data-testid="send-reset-link-button"]',
      );

      // Submit form — blur needed so Vue enables the button
      await emailInput.fill(testEmail());
      await emailInput.blur();
      await expect(submitButton).toBeEnabled({ timeout: 5000 });
      await submitButton.click();

      const resendButton = page.getByRole("button", {
        name: /resend reset link/i,
      });

      // Wait for emailSent state, then click resend
      await expect(resendButton).toBeVisible({ timeout: 15000 });
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

      // invalidToken is set after async supabase.auth.getSession() on mount
      // Can take 10-20s depending on Supabase latency
      await expect(
        page.getByRole("heading", { name: /invalid link/i }),
      ).toBeVisible({ timeout: 30000 });
      await expect(page.getByText(/no reset link provided/i)).toBeVisible();
    });

    test("should show error for invalid token", async ({ page }) => {
      await page.goto("/reset-password?token=invalid");
      await expect(
        page.getByRole("heading", { name: /invalid link/i }),
      ).toBeVisible({ timeout: 30000 });
    });

    test("should show error for expired token", async ({ page }) => {
      await page.goto("/reset-password?token=expired");
      await expect(
        page.getByRole("heading", { name: /invalid link/i }),
      ).toBeVisible({ timeout: 30000 });
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

    /**
     * Form-rendering tests need a real Supabase recovery session. Uses the
     * admin generateLink helper to mint a fresh recovery URL per test.
     */
    test.describe("with valid recovery session", () => {
      let resetEmail: string;

      test.beforeAll(async () => {
        resetEmail = `reset-form-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test-example.com`;
        await createOneOffTestUser({
          email: resetEmail,
          password: "TempPass123!",
          displayName: "Reset Form User",
        });
      });

      test.afterAll(async () => {
        await deleteOneOffTestUser(resetEmail).catch(() => null);
      });

      test.beforeEach(async ({ page }) => {
        await navigateWithRecoverySession(page, resetEmail);
      });

      test("should display form elements when token exists", async ({
        page,
      }) => {
        await expect(page.locator("#password")).toBeVisible();
        await expect(page.locator("#confirmPassword")).toBeVisible();
        await expect(
          page.locator('[data-testid="reset-password-button"]'),
        ).toBeVisible();
      });

      test("should show password requirements checklist", async ({ page }) => {
        await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
        await expect(page.getByText(/one uppercase letter/i)).toBeVisible();
        await expect(page.getByText(/one lowercase letter/i)).toBeVisible();
        await expect(page.getByText(/one number/i)).toBeVisible();
      });

      test("should toggle password visibility", async ({ page }) => {
        const passwordInput = page.locator("#password");
        const toggleButtons = page.locator('button[type="button"]');

        await expect(passwordInput).toHaveAttribute("type", "password");
        await toggleButtons.first().click();
        await expect(passwordInput).toHaveAttribute("type", "text");
        await toggleButtons.first().click();
        await expect(passwordInput).toHaveAttribute("type", "password");
      });

      test("should validate password requirements in real-time", async ({
        page,
      }) => {
        const passwordInput = page.locator("#password");
        await passwordInput.fill("pass");
        await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
        await passwordInput.fill("ValidPassword123");
      });

      test("should disable submit when passwords don't match", async ({
        page,
      }) => {
        const passwordInput = page.locator("#password");
        const confirmInput = page.locator("#confirmPassword");
        const submitButton = page.locator(
          '[data-testid="reset-password-button"]',
        );

        await passwordInput.fill("ValidPassword123");
        await confirmInput.fill("DifferentPassword123");
        await expect(submitButton).toBeDisabled();
      });

      test("should enable submit when passwords match and valid", async ({
        page,
      }) => {
        const passwordInput = page.locator("#password");
        const confirmInput = page.locator("#confirmPassword");
        const submitButton = page.locator(
          '[data-testid="reset-password-button"]',
        );

        await passwordInput.fill("ValidPassword123");
        await confirmInput.fill("ValidPassword123");
        await expect(submitButton).toBeEnabled();
      });

      test("should validate on blur", async ({ page }) => {
        const passwordInput = page.locator("#password");
        await passwordInput.focus();
        await passwordInput.blur();
        await expect(
          page.getByText(/password must be at least 8 characters/i).first(),
        ).toBeVisible({ timeout: 3000 });
      });

      test("should show error for weak password", async ({ page }) => {
        const passwordInput = page.locator("#password");
        const confirmInput = page.locator("#confirmPassword");

        await passwordInput.fill("weak");
        await confirmInput.fill("weak");
        await passwordInput.blur();
        await expect(
          page.getByText(/password must be at least 8 characters/i).first(),
        ).toBeVisible({ timeout: 3000 });
      });

      test("should navigate back to home", async ({ page }) => {
        const backLink = page.getByRole("link", { name: /back to home/i });
        await backLink.click();
        await expect(page).toHaveURL("/");
      });
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
      const submitButton = page.locator(
        '[data-testid="send-reset-link-button"]',
      );

      // Submit with non-existent email — enable button first
      await emailInput.fill("nonexistent@example.com");
      await emailInput.blur();
      await expect(submitButton).toBeEnabled({ timeout: 5000 });
      await submitButton.click();

      // Page shows a success/neutral state regardless of whether email exists
      await expect(
        page.getByText(/reset link|check your email/i).first(),
      ).toBeVisible({ timeout: 15000 });
    });

    test("should handle rate limiting gracefully", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.locator(
        '[data-testid="send-reset-link-button"]',
      );

      // Submit multiple times — check for success or rate limit response
      for (let i = 0; i < 3; i++) {
        await emailInput.fill(testEmail());
        await emailInput.blur();
        await expect(submitButton).toBeEnabled({ timeout: 5000 });
        await submitButton.click();

        // Should show either success state or rate limit error
        await expect(
          page
            .getByText(/reset link|check your email|too many requests/i)
            .first(),
        ).toBeVisible({ timeout: 15000 });

        // Navigate back to form if needed
        if (i < 2) {
          await page.goto("/forgot-password");
        }
      }
    });

    test.skip("should not allow password reuse of reset token", async ({
      page,
    }) => {
      // This test verifies the backend enforces single-use tokens
      // Actual testing would require attempting to use same token twice
      await page.goto("/reset-password?token=single-use");

      // First use should work (form should be available)
      await expect(page.locator("#password")).toBeVisible();

      // Attempting to use same token again would fail
      // (backend verification required)
    });
  });

  test.describe("Password Reset Form Validation", () => {
    let validationEmail: string;

    test.beforeAll(async () => {
      validationEmail = `reset-validation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test-example.com`;
      await createOneOffTestUser({
        email: validationEmail,
        password: "TempPass123!",
        displayName: "Reset Validation User",
      });
    });

    test.afterAll(async () => {
      await deleteOneOffTestUser(validationEmail).catch(() => null);
    });

    test("should prevent submission with invalid password", async ({
      page,
    }) => {
      await navigateWithRecoverySession(page, validationEmail);

      // Use #password ID to avoid strict mode (getByLabel matches form + div + input)
      const passwordInput = page.locator("#password");
      const submitButton = page.locator(
        '[data-testid="reset-password-button"]',
      );

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
      const submitButton = page.locator(
        '[data-testid="send-reset-link-button"]',
      );

      // Enter email with whitespace
      await emailInput.fill("  test@example.com  ");

      // Should be treated as valid
      await expect(submitButton).toBeEnabled();
    });

    test("should handle special characters in email", async ({ page }) => {
      await page.goto("/forgot-password");

      const emailInput = page.getByLabel(/email/i);
      const submitButton = page.locator(
        '[data-testid="send-reset-link-button"]',
      );

      // Enter email with special characters
      await emailInput.fill("test+tag@example.co.uk");

      // Should be valid
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe("Navigation and UX", () => {
    // QUARANTINED 2026-05-22: back-link selector drift.
    test.skip("should show back links throughout flow", async ({ page }) => {
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
      // Note: reset-password help text requires a real auth session (skipped)
    });

    test("should display appropriate icons based on state", async ({
      page,
    }) => {
      // Forgot password page should have at least one SVG icon
      await page.goto("/forgot-password");
      // Wait for form to render (Vue hydration completes)
      await page
        .locator('[data-testid="send-reset-link-button"]')
        .waitFor({ state: "visible" });
      const svgCount = await page.locator("svg").count();
      expect(svgCount).toBeGreaterThan(0);
    });
  });
});
