import { test, expect, type Page } from "@playwright/test";

/**
 * Entry-flow coverage: a brand-new user signing up and driving the onboarding
 * wizard all the way to the dashboard. The existing signup-flow spec stops at
 * the post-signup redirect URL; these tests carry the journey through to
 * completion for BOTH roles — the seam a real first-time user actually hits.
 *
 * Each test mints a per-run account (teardown reaps debris users by the
 * @example.com pattern in global-teardown), so no shared seeded state is
 * touched and runs stay isolated.
 */

// Unique suffix per run avoids "already registered" collisions across reruns
// and parallel workers.
const RUN = Date.now();

const PASSWORD = "SecurePass123";

/** Signs up a fresh account through the real signup UI. */
async function signUp(
  page: Page,
  role: "player" | "parent",
  email: string,
): Promise<void> {
  await page.goto("/signup");
  await page.click(`[data-testid="user-type-${role}"]`);
  await expect(
    page.locator(`[data-testid="signup-form-${role}"]`),
  ).toBeVisible();

  await page.fill("#firstName", role === "player" ? "Player" : "Parent");
  await page.fill("#lastName", "E2E");
  if (role === "player") {
    // 18+ so the COPPA / minor-guardian gate never blocks a standalone signup.
    await page.fill("#dateOfBirth", "2005-01-15");
  }
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.fill("#confirmPassword", PASSWORD);
  await page.check("#agreeToTerms");

  await expect(
    page.locator('[data-testid="signup-button"]'),
  ).not.toBeDisabled();
  await page.click('[data-testid="signup-button"]');
}

test.describe("Onboarding Completion - Full Entry Journey", () => {
  // These specs must run unauthenticated — they create their own accounts.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("player: signup → complete wizard → dashboard", async ({ page }) => {
    const email = `player-onboard-${RUN}@example.com`;
    await signUp(page, "player", email);

    // Player signup lands on the player onboarding wizard.
    await expect(page).toHaveURL(/\/onboarding(\/|$|\?)/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/onboarding\/parent/);

    // Step 1 — Welcome
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2 — Basic Info (graduation year + primary sport + position required)
    await page
      .locator("#onboarding-graduation-year")
      .selectOption({ index: 1 });
    await page.locator("#onboarding-primary-sport").selectOption("Baseball");
    // Position select appears once a sport is chosen.
    await expect(page.locator("#onboarding-primary-position")).toBeVisible();
    await page
      .locator("#onboarding-primary-position")
      .selectOption({ index: 1 });
    await page.getByRole("button", { name: "Next" }).click();

    // Step 3 — Location (zip required, must be 5 digits to advance)
    await page.locator('input[autocomplete="postal-code"]').fill("44092");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 4 — Academics (all optional) → "Review" advances to step 5
    await page.getByRole("button", { name: "Review" }).click();

    // Step 5 — Invite parent. Complete without inviting.
    await expect(page.locator('[data-testid="step-5-invite"]')).toBeVisible();
    await page.getByRole("button", { name: "I'll invite them later" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test("parent: signup → complete wizard → dashboard", async ({ page }) => {
    const email = `parent-onboard-${RUN}@example.com`;
    await signUp(page, "parent", email);

    // Parent signup lands on the dedicated parent onboarding wizard.
    await expect(page).toHaveURL(/\/onboarding\/parent/, { timeout: 15000 });

    // Step 1 — Player details (all required to advance)
    await page.locator('[data-testid="player-name"]').fill("Kid E2E");
    await page.locator('[data-testid="player-dob"]').fill("2008-05-10");
    await page
      .locator('[data-testid="graduation-year"]')
      .selectOption({ index: 1 });
    await page.locator('[data-testid="sport"]').selectOption("Baseball");
    await expect(page.locator('[data-testid="position"]')).toBeVisible();
    await page.locator('[data-testid="position"]').selectOption({ index: 1 });
    await page.locator('[data-testid="next-button"]').click();

    // Step 2 — Invite player. Complete via "I'll invite them later".
    await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    await page.locator('[data-testid="skip-invite"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});
