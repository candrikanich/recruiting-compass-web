import type { Page } from "@playwright/test";

/**
 * Login via the UI form, properly triggering blur events so Vue's form
 * validation runs and the submit button becomes enabled.
 *
 * The login button uses :disabled="!isFormValid || disabled" where isFormValid
 * depends on Vue reactive state that requires blur events to settle.
 */
export async function loginViaForm(
  page: Page,
  email: string,
  password: string,
  redirectUrl: string | RegExp = "/dashboard",
) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="email"]').blur();
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').blur();

  // Wait for Vue to enable the button after reactive updates settle
  await page.locator('[data-testid="login-button"]').waitFor({
    state: "visible",
  });
  await page.waitForFunction(
    () =>
      !document
        .querySelector('[data-testid="login-button"]')
        ?.hasAttribute("disabled"),
  );
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(redirectUrl, { timeout: 15000 });
}
