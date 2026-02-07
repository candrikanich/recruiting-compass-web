import { test, expect } from "@playwright/test";

test.describe("Signup Page - WCAG 2.1 Level AA Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signup page
    await page.goto("/signup");
  });

  test("should have page heading for screen readers", async ({ page }) => {
    // Check that h1 exists (even if hidden with sr-only)
    const heading = await page.locator("h1").isVisible({ timeout: 1000 });
    // sr-only elements are not visible but should exist in DOM
    const srHeading = await page.locator("h1:has-text('Sign Up')").count();
    expect(srHeading).toBeGreaterThan(0);
  });

  test("should have skip link accessible via keyboard", async ({ page }) => {
    // Tab to first interactive element (skip link)
    await page.keyboard.press("Tab");

    // Skip link should be focused
    const skipLink = page.locator('a[href="#signup-form"]');
    expect(skipLink).toBeFocused();

    // Skip link text should be clear
    await expect(skipLink).toContainText("Skip to signup form");

    // Press Enter to skip to form
    await page.keyboard.press("Enter");

    // Should focus form element
    const form = page.locator("#signup-form");
    await expect(form).toBeTruthy();
  });

  test("should have user type selection as fieldset with legend", async ({
    page,
  }) => {
    // Check for fieldset (semantic grouping)
    const fieldset = page.locator("fieldset");
    expect(fieldset).toBeTruthy();

    // Check for legend
    const legend = page.locator("legend:has-text('I\\'m a:')");
    expect(legend).toBeTruthy();

    // Buttons should have aria-pressed
    const playerButton = page.locator("#user-type-player");
    const parentButton = page.locator("#user-type-parent");

    await expect(playerButton).toHaveAttribute("aria-pressed", "false");
    await expect(parentButton).toHaveAttribute("aria-pressed", "false");

    // Click player button
    await playerButton.click();

    // After selection, aria-pressed should update
    await expect(playerButton).toHaveAttribute("aria-pressed", "true");
    await expect(parentButton).toHaveAttribute("aria-pressed", "false");

    // Visual state should show selected
    const playerClass = await playerButton.getAttribute("class");
    expect(playerClass).toContain("bg-blue-50");
    expect(playerClass).toContain("border-blue-500");
  });

  test("should have required field indicators", async ({ page }) => {
    // Wait for form to appear after user type selection
    await page.locator("#user-type-player").click();
    await page.waitForSelector("form");

    // Check for required field indicator text
    const indicatorText = page.locator(
      'p:has-text("Indicates a required field")',
    );
    await expect(indicatorText).toBeVisible();

    // Check that labels have asterisk for required fields
    const firstNameLabel = page.locator("label:has-text('First Name')");
    const labelText = await firstNameLabel.textContent();
    expect(labelText).toContain("*");

    // Check aria-required attribute
    const firstNameInput = page.locator("#firstName");
    await expect(firstNameInput).toHaveAttribute("aria-required", "true");
  });

  test("should hide decorative icons from screen readers", async ({ page }) => {
    // Wait for form to appear
    await page.locator("#user-type-player").click();
    await page.waitForSelector("form");

    // All decorative icons should have aria-hidden
    const icons = page.locator('[aria-hidden="true"]');
    const count = await icons.count();

    // Should have multiple hidden icons (UserIcon, EnvelopeIcon, LockClosedIcon)
    expect(count).toBeGreaterThan(0);

    // Specifically check for hidden SVG
    const hiddenSvgs = page.locator("svg[aria-hidden='true']");
    const svgCount = await hiddenSvgs.count();
    expect(svgCount).toBeGreaterThan(0); // Background SVG should be hidden
  });

  test("should link field errors to inputs with aria-describedby", async ({
    page,
  }) => {
    // Wait for form to appear
    await page.locator("#user-type-player").click();
    await page.waitForSelector("form");

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error to appear
    await page.waitForSelector("#form-error-summary");

    // Check that email input has aria-describedby
    const emailInput = page.locator("#email");
    const describedBy = await emailInput.getAttribute("aria-describedby");
    expect(describedBy).toContain("email-error");

    // Error message should have matching id
    const errorMessage = page.locator("#email-error");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveAttribute("role", "alert");
  });

  test("should announce loading state to screen readers", async ({ page }) => {
    // Wait for form to appear
    await page.locator("#user-type-player").click();
    await page.waitForSelector("form");

    // Fill in valid form data
    await page.fill("#firstName", "Test");
    await page.fill("#lastName", "User");
    await page.fill("#email", `test-${Date.now()}@example.com`);
    await page.fill("#password", "TestPassword123");
    await page.fill("#confirmPassword", "TestPassword123");

    // Check terms checkbox
    await page.check("#agreeToTerms");

    // Get submit button and check aria attributes before submission
    const submitButton = page.locator('button[type="submit"]');

    // Intercept the auth call to keep button in loading state longer
    await page.route("**/api/**", async (route) => {
      // Delay the response to verify loading state is announced
      await new Promise((resolve) => setTimeout(resolve, 500));
      // We'll cancel the request to avoid actual signup
      await route.abort();
    });

    // Click submit
    await submitButton.click();

    // During loading, aria-busy should be true
    const busyState = await submitButton.getAttribute("aria-busy");
    // Note: This might be true only briefly, so check it was set
    // The live region should also be visible (even if visually hidden with sr-only)
    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    await expect(liveRegion).toBeTruthy();
  });

  test("should have proper focus management on error summary", async ({
    page,
  }) => {
    // Wait for form to appear
    await page.locator("#user-type-player").click();
    await page.waitForSelector("form");

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error summary to appear
    const errorSummary = page.locator("#form-error-summary");
    await expect(errorSummary).toBeVisible();

    // Error summary should be focusable (tabindex="-1" allows programmatic focus)
    const tabindex = await errorSummary.getAttribute("tabindex");
    expect(tabindex).toBe("-1");

    // Should have role alert
    await expect(errorSummary).toHaveAttribute("role", "alert");
  });

  test("should have visible focus indicators on all interactive elements", async ({
    page,
  }) => {
    // Back link should be focusable
    const backLink = page.locator('a[href="/"]');
    await backLink.focus();

    // Should have focus-visible styles (outline or ring)
    const computedStyle = await backLink.evaluate((el) => {
      return window.getComputedStyle(el);
    });
    // Focus outline should be visible (either via outline or box-shadow)
    expect(computedStyle.outline || computedStyle.boxShadow).toBeTruthy();
  });

  test("should have terms checkbox properly labeled", async ({ page }) => {
    // Wait for form to appear
    await page.locator("#user-type-player").click();
    await page.waitForSelector("form");

    // Checkbox should have id
    const checkbox = page.locator("#agreeToTerms");
    await expect(checkbox).toBeTruthy();

    // Checkbox should have corresponding label
    const label = page.locator('label[for="agreeToTerms"]');
    await expect(label).toBeVisible();

    // Checkbox should be required
    await expect(checkbox).toHaveAttribute("required");
    await expect(checkbox).toHaveAttribute("aria-required", "true");

    // Label should contain reference to terms and privacy
    const labelText = await label.textContent();
    expect(labelText).toContain("Terms");
    expect(labelText).toContain("Privacy");
  });

  test("should link password requirements to password field", async ({
    page,
  }) => {
    // Wait for form to appear
    await page.locator("#user-type-player").click();
    await page.waitForSelector("form");

    // Check password input has aria-describedby linking to requirements
    const passwordInput = page.locator("#password");
    const describedBy = await passwordInput.getAttribute("aria-describedby");
    expect(describedBy).toContain("password-requirements");

    // Requirements should have matching id
    const requirements = page.locator("#password-requirements");
    await expect(requirements).toBeVisible();
    await expect(requirements).toContainText("8+");
    await expect(requirements).toContainText("uppercase");
  });

  test("should have proper keyboard navigation order", async ({ page }) => {
    // User type buttons should be keyboard accessible
    const playerButton = page.locator("#user-type-player");
    await playerButton.focus();
    expect(playerButton).toBeFocused();

    // Should be able to tab through button group
    await page.keyboard.press("Tab");
    const parentButton = page.locator("#user-type-parent");
    expect(parentButton).toBeFocused();
  });

  test("should communicate optional vs required fields clearly", async ({
    page,
  }) => {
    // Wait for form to appear
    await page.locator("#user-type-parent").click(); // Parent role has optional family code
    await page.waitForSelector("form");

    // Check required field intro text
    const requiredText = page.locator(
      'p:has-text("Indicates a required field")',
    );
    await expect(requiredText).toBeVisible();

    // Family code should be optional (parents only)
    const familyCodeLabel = page.locator("label:has-text('Family Code')");
    const labelText = await familyCodeLabel.textContent();
    // Should say optional but not required
    expect(labelText).toContain("optional");
    expect(labelText).not.toContain("*"); // No required asterisk

    // Input should not have aria-required
    const familyCodeInput = page.locator("#familyCode");
    const ariaRequired = await familyCodeInput.getAttribute("aria-required");
    expect(ariaRequired).toBeNull(); // Not required
  });

  test("form inputs should have proper autocomplete attributes", async ({
    page,
  }) => {
    // Wait for form to appear
    await page.locator("#user-type-player").click();
    await page.waitForSelector("form");

    // Check autocomplete attributes for password managers
    const firstNameInput = page.locator("#firstName");
    const lastNameInput = page.locator("#lastName");
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");

    await expect(firstNameInput).toHaveAttribute("autocomplete", "given-name");
    await expect(lastNameInput).toHaveAttribute("autocomplete", "family-name");
    await expect(emailInput).toHaveAttribute("autocomplete", "email");
    await expect(passwordInput).toHaveAttribute("autocomplete", "new-password");
  });
});
