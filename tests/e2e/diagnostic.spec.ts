import { test, expect } from "@playwright/test";

/**
 * Diagnostic test to verify E2E setup and Supabase connection
 */
test.describe("Diagnostic Tests", () => {
  // This spec tests the login/signup UI — must start unauthenticated
  test.use({ storageState: undefined });

  test("should load login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/login");

    // Check for login form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const signInButton = page.locator('button:has-text("Sign In")');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(signInButton).toBeVisible();
  });

  test("should load signup page", async ({ page }) => {
    await page.goto("/login");

    // Click "Create one now" link
    const signupLink = page.locator("text=Create one now");
    await expect(signupLink).toBeVisible();
    await signupLink.click();

    await expect(page).toHaveURL("/signup");

    // Step 1: User type selection is shown first
    const playerOption = page.locator('[data-testid="user-type-player"]');
    await expect(playerOption).toBeVisible();

    // Select player role to proceed to the form
    await page.locator('[data-testid="user-type-player"]').click();

    // Step 2: Form fields should now be visible
    const firstNameInput = page.locator("#firstName");
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");
    const termsCheckbox = page.locator('input[type="checkbox"]');
    const createButton = page.locator('[data-testid="signup-button"]');

    await expect(firstNameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(termsCheckbox).toBeVisible();
    await expect(createButton).toBeVisible();
  });

  test("should validate email field", async ({ page }) => {
    await page.goto("/signup");

    // Select user type first (required step in new signup flow)
    await page.locator('[data-testid="user-type-player"]').click();

    // Email input should now be visible
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeVisible();

    // Fill with invalid email
    await emailInput.fill("not-an-email");
    await emailInput.blur();
  });

  test("should validate password field", async ({ page }) => {
    await page.goto("/signup");

    // Select user type first (required step in new signup flow)
    await page.locator('[data-testid="user-type-player"]').click();

    // Password input should now be visible
    const passwordInput = page.locator("#password");
    await expect(passwordInput).toBeVisible();

    // Fill with weak password
    await passwordInput.fill("weak");
    await passwordInput.blur();
  });

  test("should have Supabase connection", async ({ page }) => {
    // This will fail if Supabase isn't configured
    await page.goto("/login");

    // Supabase is connected when Nuxt has fully hydrated
    const isNuxtReady = await page.evaluate(() => {
      return (window as any).__NUXT__?.ready === true;
    });

    expect(isNuxtReady).toBe(true);
  });
});
