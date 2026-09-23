import { expect, type Page } from "@playwright/test";

/**
 * Player signup is a wizard: account → (guardian, 13-17 only) → info
 * (grad year, sport, terms) → submit. Parent signup is a single form and does
 * not use these helpers. Keep step knowledge here so a wizard change touches
 * one file instead of every spec that signs up a player.
 */

export interface PlayerAccountFields {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  password: string;
}

/** Selects the player role and fills the account step (does not continue). */
export async function fillPlayerAccountStep(
  page: Page,
  fields: PlayerAccountFields,
): Promise<void> {
  await page.click('[data-testid="user-type-player"]');
  const playerForm = page.locator('[data-testid="signup-form-player"]');
  await playerForm.waitFor({ state: "visible" });
  await expect(playerForm).toBeVisible();

  await page.fill("#firstName", fields.firstName);
  await page.fill("#lastName", fields.lastName);
  await page.fill("#dateOfBirth", fields.dateOfBirth);
  await page.fill("#email", fields.email);
  await page.fill("#password", fields.password);
  await page.fill("#confirmPassword", fields.password);
}

/** Advances past the account step; skips the guardian step when a minor sees it. */
export async function continueToPlayerInfoStep(page: Page): Promise<void> {
  await page.getByTestId("signup-step-continue").click();

  const guardianSkip = page.getByTestId("signup-guardian-skip");
  const gradYear = page.locator("#signup-graduation-year");
  const nextStep = guardianSkip.or(gradYear);
  await nextStep.waitFor({ state: "visible" });
  if (await guardianSkip.isVisible()) {
    await guardianSkip.click();
  }
  await gradYear.waitFor({ state: "visible" });
  await expect(gradYear).toBeVisible();
}

/** Fills the info step: first offered grad year, a sport, and terms. */
export async function fillPlayerInfoStep(page: Page): Promise<void> {
  await page.selectOption("#signup-graduation-year", { index: 1 });
  await page.selectOption("#signup-primary-sport", "Basketball");
  await page.check("#agreeToTerms");
}

/** Full wizard through to a ready-to-submit form (button not yet clicked). */
export async function completePlayerSignupForm(
  page: Page,
  fields: PlayerAccountFields,
): Promise<void> {
  await fillPlayerAccountStep(page, fields);
  await continueToPlayerInfoStep(page);
  await fillPlayerInfoStep(page);
}
