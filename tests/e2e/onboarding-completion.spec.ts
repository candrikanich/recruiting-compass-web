import { test, expect, type Page } from "@playwright/test";

/**
 * Entry-flow coverage: a brand-new user signing up and driving the v2
 * onboarding wizard (2-step: sport+grad+zip → school recommendations)
 * all the way to the dashboard. The signup-flow spec stops at the
 * post-signup redirect URL; these tests carry the journey through to
 * completion for BOTH roles.
 *
 * Each test mints a per-run account (teardown reaps debris users by the
 * @example.com pattern in global-teardown), so no shared seeded state is
 * touched and runs stay isolated.
 */

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

test.describe("Onboarding v2 — Full Entry Journey", () => {
  // These specs must run unauthenticated — they create their own accounts.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("player: signup → 2-step wizard → dashboard", async ({ page }) => {
    const email = `player-onboard-${RUN}@example.com`;
    await signUp(page, "player", email);

    // Player signup lands on the player onboarding wizard.
    await expect(page).toHaveURL(/\/onboarding(\/|$|\?)/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/onboarding\/parent/);

    // Step 1 — Tell us about you (grad year + sport required, zip optional)
    await page
      .locator("#onboarding-graduation-year")
      .selectOption({ index: 1 });
    await page.locator("#onboarding-primary-sport").selectOption("Baseball");
    await page.locator("#onboarding-zip-code").fill("44092");

    await page.getByRole("button", { name: "Next" }).click();

    // Step 2 — Schools to explore (recommendations widget)
    await expect(
      page.getByRole("heading", { name: "Schools to explore" }),
    ).toBeVisible({ timeout: 10000 });

    // Complete onboarding → dashboard
    await page
      .getByRole("button", { name: /go to your dashboard/i })
      .click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test("player: step 1 validation blocks empty sport/grad year", async ({
    page,
  }) => {
    const email = `player-validate-${RUN}@example.com`;
    await signUp(page, "player", email);

    await expect(page).toHaveURL(/\/onboarding(\/|$|\?)/, { timeout: 15000 });

    // Click Next without filling required fields
    await page.getByRole("button", { name: "Next" }).click();

    // Should stay on step 1 with validation errors
    await expect(page.getByText("Primary sport is required")).toBeVisible();
    await expect(page.getByText("Graduation year is required")).toBeVisible();
  });

  test("player: back button returns to step 1", async ({ page }) => {
    const email = `player-back-${RUN}@example.com`;
    await signUp(page, "player", email);

    await expect(page).toHaveURL(/\/onboarding(\/|$|\?)/, { timeout: 15000 });

    // Complete step 1
    await page
      .locator("#onboarding-graduation-year")
      .selectOption({ index: 1 });
    await page.locator("#onboarding-primary-sport").selectOption("Soccer");
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 2
    await expect(
      page.getByRole("heading", { name: "Schools to explore" }),
    ).toBeVisible({ timeout: 10000 });

    // Go back
    await page.getByRole("button", { name: "Back", exact: true }).click();

    // Should see step 1 content again
    await expect(
      page.getByRole("heading", { name: "Tell us about you" }),
    ).toBeVisible();
  });

  test("parent: signup → 2-step wizard → dashboard", async ({ page }) => {
    const email = `parent-onboard-${RUN}@example.com`;
    await signUp(page, "parent", email);

    // Parent signup lands on the dedicated parent onboarding wizard.
    await expect(page).toHaveURL(/\/onboarding\/parent/, { timeout: 15000 });

    // Step 1 — Player details (name optional, DOB + grad year + sport required)
    await page.locator('[data-testid="player-name"]').fill("Kid E2E");
    await page.locator('[data-testid="player-dob"]').fill("2008-05-10");
    await page
      .locator('[data-testid="graduation-year"]')
      .selectOption({ index: 1 });
    await page.locator('[data-testid="sport"]').selectOption("Baseball");
    await page.locator('[data-testid="next-button"]').click();

    // Step 2 — Schools to explore
    await expect(page.locator('[data-testid="step-2"]')).toBeVisible({
      timeout: 10000,
    });

    // Complete → dashboard
    await page.locator('[data-testid="go-to-dashboard"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test("parent: COPPA gate blocks under-13 DOB", async ({ page }) => {
    const email = `parent-coppa-${RUN}@example.com`;
    await signUp(page, "parent", email);

    await expect(page).toHaveURL(/\/onboarding\/parent/, { timeout: 15000 });

    // Enter a DOB that makes the player under 13
    const recentDob = new Date();
    recentDob.setFullYear(recentDob.getFullYear() - 10);
    const dobStr = recentDob.toISOString().split("T")[0];
    await page.locator('[data-testid="player-dob"]').fill(dobStr);

    // Age error should appear
    await expect(page.locator('[data-testid="age-error"]')).toBeVisible();

    // Next button should be disabled
    await expect(
      page.locator('[data-testid="next-button"]'),
    ).toBeDisabled();
  });
});
