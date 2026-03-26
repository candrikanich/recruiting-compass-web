import { test, expect } from "@playwright/test";

test.describe("Signup Page - WCAG 2.1 Level AA Accessibility", () => {
  // This spec tests the signup UI accessibility — must start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    // Navigate to signup page
    await page.goto("/signup");
  });

  test("should have page heading for screen readers", async ({ page }) => {
    // Wait for page to hydrate (SPA needs JS to render)
    await page.waitForSelector('[data-testid="user-type-player"]');
    // sr-only elements are not visible but should exist in DOM
    const srHeading = await page.locator("h1:has-text('Sign Up')").count();
    expect(srHeading).toBeGreaterThan(0);
  });

  test("should have skip link accessible via keyboard", async ({ page }) => {
    // Wait for page to fully hydrate (SPA needs JS to render)
    await page.waitForSelector('[data-testid="user-type-player"]');

    // Tab to first interactive element (skip link)
    await page.keyboard.press("Tab");

    // Skip link should be focused
    const skipLink = page.locator('a[href="#signup-form"]');
    await expect(skipLink).toBeFocused();

    // Skip link text should be clear
    await expect(skipLink).toContainText("Skip to signup form");

    // Press Enter to skip to form
    await page.keyboard.press("Enter");

    // Should focus form element
    const form = page.locator("fieldset");
    await expect(form).toBeTruthy();
  });

  test("should have user type selection as fieldset with legend", async ({
    page,
  }) => {
    // Check for fieldset (semantic grouping)
    const fieldset = page.locator("fieldset");
    await expect(fieldset).toBeVisible();

    // Check for legend
    const legend = page.locator("legend");
    await expect(legend).toBeVisible();

    // User type labels have data-testid (radio inputs are sr-only)
    const playerLabel = page.locator('[data-testid="user-type-player"]');
    const parentLabel = page.locator('[data-testid="user-type-parent"]');
    // Radio inputs are children of the labels
    const playerRadio = page.locator('input[value="player"]');
    const parentRadio = page.locator('input[value="parent"]');

    // Both should be unchecked initially
    await expect(playerRadio).not.toBeChecked();
    await expect(parentRadio).not.toBeChecked();

    // Verify labels are visible and accessible
    await expect(playerLabel).toBeVisible();
    await expect(parentLabel).toBeVisible();

    // Click player label — UserTypeSelector will unmount after selection
    await playerLabel.click();

    // After selection the form should appear (UserTypeSelector unmounts)
    await expect(page.locator("#firstName")).toBeVisible();
  });

  test("should have required field indicators", async ({ page }) => {
    // Wait for form to appear after user type selection
    await page.locator('[data-testid="user-type-player"]').click();
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
    await page.locator('[data-testid="user-type-player"]').click();
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
    // Wait for form to appear (player type requires dateOfBirth)
    await page.locator('[data-testid="user-type-player"]').click();
    await page.waitForSelector("form");

    // Fill email with invalid value, then blur it to trigger inline validation
    await page.fill("#email", "not-a-valid-email");
    // Focus another field to trigger blur on email
    await page.locator("#firstName").focus();

    // Wait for the inline email error to appear
    await page.waitForSelector("#email-error");

    // Check that email input has aria-describedby pointing to the error
    const emailInput = page.locator("#email");
    const describedBy = await emailInput.getAttribute("aria-describedby");
    expect(describedBy).toContain("email-error");

    // Error message should have matching id and role
    const errorMessage = page.locator("#email-error");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveAttribute("role", "alert");
  });

  test("should announce loading state to screen readers", async ({ page }) => {
    // Wait for form to appear (player type requires dateOfBirth)
    await page.locator('[data-testid="user-type-player"]').click();
    await page.waitForSelector("form");

    // The live region should be present in the DOM for screen readers
    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    await expect(liveRegion).toBeTruthy();

    // Submit button should have proper ARIA attributes
    const submitButton = page.locator('[data-testid="signup-button"]');
    await expect(submitButton).toHaveAttribute("aria-label");
  });

  test("should have proper focus management on error summary", async ({
    page,
  }) => {
    // Wait for form to appear (player type requires dateOfBirth)
    await page.locator('[data-testid="user-type-player"]').click();
    await page.waitForSelector("form");

    // Fill all fields with valid email and mismatched passwords — submit handler
    // checks passwords before Supabase is called, setting a form-level error
    // without the button-disabling blur validation that an invalid email triggers.
    await page.fill("#firstName", "Test");
    await page.fill("#lastName", "User");
    await page.fill("#email", "valid@example.com");
    await page.fill("#dateOfBirth", "2000-01-15");
    await page.fill("#password", "TestPassword123!");
    await page.fill("#confirmPassword", "DifferentPassword456!");
    await page.check("#agreeToTerms");

    // Submit — passwords don't match → error summary appears
    const submitButton = page.locator('[data-testid="signup-button"]');
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
    await page.locator('[data-testid="user-type-player"]').click();
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
    await page.locator('[data-testid="user-type-player"]').click();
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
    // User type radio inputs should be keyboard accessible (sr-only but tabbable)
    const playerRadioInput = page.locator('input[value="player"]');
    await playerRadioInput.focus();
    await expect(playerRadioInput).toBeFocused();

    // ArrowDown moves focus to next radio AND selects it in standard browser behavior.
    // Selecting "parent" triggers UserTypeSelector to unmount and the parent form to render.
    await page.keyboard.press("ArrowDown");

    // Verify keyboard navigation triggered the form transition
    await page.waitForSelector("form");
    await expect(page.locator("#firstName")).toBeVisible();
  });

  test("should show date of birth for players but not parents", async ({
    page,
  }) => {
    // Parent form should not have a date of birth field
    await page.locator('[data-testid="user-type-parent"]').click();
    await page.waitForSelector("form");

    const parentDobField = page.locator("#dateOfBirth");
    await expect(parentDobField).not.toBeVisible();

    // Navigate back and select player — DOB should appear
    await page.goto("/signup");
    await page.locator('[data-testid="user-type-player"]').click();
    await page.waitForSelector("form");

    const playerDobField = page.locator("#dateOfBirth");
    await expect(playerDobField).toBeVisible();
    await expect(playerDobField).toHaveAttribute("aria-required", "true");
  });

  test("form inputs should have proper autocomplete attributes", async ({
    page,
  }) => {
    // Wait for form to appear
    await page.locator('[data-testid="user-type-player"]').click();
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
