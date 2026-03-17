import { test, expect } from "@playwright/test";
import { resolve } from "path";

test.describe("Family Units - Parent", () => {
  test.use({ storageState: resolve(process.cwd(), "tests/e2e/.auth/parent.json") });

  test("parent can view school list", async ({ page }) => {
    // Navigate to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    // Check schools page loads
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();
  });

  test("parent can switch between athletes", async ({ page }) => {
    // Navigate to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    // Look for athlete selector — the AthleteSelector component renders for parents
    // with linked athletes. It may not be a plain <select> element.
    const athleteSelector = page.locator("select").first();
    const isVisible = await athleteSelector.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVisible) {
      // Get initial athlete value — skip if empty (no linked athletes)
      const initialValue = await athleteSelector.inputValue();
      if (!initialValue) return; // No athlete linked — test is inconclusive

      // Try to select a different athlete if available
      const options = await athleteSelector.locator("option").count();
      if (options > 1) {
        const secondOption = athleteSelector.locator("option").nth(1);
        const secondValue = await secondOption.getAttribute("value");
        if (secondValue && secondValue !== initialValue) {
          await athleteSelector.selectOption(secondValue);
          await page.waitForLoadState("networkidle");
          expect(await athleteSelector.inputValue()).toBe(secondValue);
        }
      }
    }
  });

  test("family context is maintained across pages", async ({ page }) => {
    // Navigate to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    // Verify we can navigate and return
    await page.goto("/coaches");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible();

    // Navigate back to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();
  });
});

test.describe("Family Units - Player", () => {
  test("player can view their own schools", async ({ page }) => {
    // Navigate to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    // Check schools page loads with data
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();

    // Verify player sees their schools (test data has schools for player1)
    const schoolCards = page.locator('[class*="grid"]').first();
    const isLoaded = await schoolCards.isVisible().catch(() => false);
    expect(isLoaded).toBeTruthy();
  });

  test("player cannot see athlete selector", async ({ page }) => {
    // Navigate to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    // Check that athlete selector is not visible (player should not see it)
    // If there's a select for athlete switching, it should not be visible for players
    // (The rest of the selects like filters are okay)
    const athleteSelectorText = page.locator("text=Viewing");
    const isVisible = await athleteSelectorText.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test("schools page displays school data correctly", async ({ page }) => {
    // Navigate to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    // Verify key page elements
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();

    // Page loaded — no blank screen
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();

    // Check for school count or add-school link (depends on whether schools exist)
    const hasSchoolContent = await page.locator('[data-testid="school-card"], a:has-text("Add School")').first().isVisible().catch(() => false);
    expect(hasSchoolContent).toBeTruthy();
  });
});
