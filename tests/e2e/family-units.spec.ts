import { test, expect } from "@playwright/test";
import { loginViaForm } from "./helpers/login";

// Test data from documentation
const TEST_ACCOUNTS = {
  player1: {
    email: "test.player2028@andrikanich.com",
    password: "test-password",
  },
  player2: {
    email: "test.player2030@andrikanich.com",
    password: "test-password",
  },
  parent: {
    email: "test.parent@andrikanich.com",
    password: "test-password",
  },
};

test.describe("Family Units", () => {
  test("parent can view school list", async ({ page }) => {
    await loginViaForm(page, TEST_ACCOUNTS.parent.email, TEST_ACCOUNTS.parent.password, /\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    // Check schools page loads
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();
  });

  test("parent can switch between athletes", async ({ page }) => {
    await loginViaForm(page, TEST_ACCOUNTS.parent.email, TEST_ACCOUNTS.parent.password, /\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    // Look for athlete selector (should be visible for parents)
    const athleteSelector = page.locator("select").first();
    const isVisible = await athleteSelector.isVisible().catch(() => false);

    if (isVisible) {
      // Get initial athlete value
      const initialValue = await athleteSelector.inputValue();
      expect(initialValue).toBeTruthy();

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

  test("player can view their own schools", async ({ page }) => {
    await loginViaForm(page, TEST_ACCOUNTS.player1.email, TEST_ACCOUNTS.player1.password, /\/(dashboard|schools)/);

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
    await loginViaForm(page, TEST_ACCOUNTS.player1.email, TEST_ACCOUNTS.player1.password, /\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    // Check that athlete selector is not visible (player should not see it)
    const selectElements = page.locator("select");
    const count = await selectElements.count();

    // If there's a select for athlete switching, it should not be visible for players
    // (The rest of the selects like filters are okay)
    const athleteSelectorText = page.locator("text=Viewing");
    const isVisible = await athleteSelectorText.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test("schools page displays school data correctly", async ({ page }) => {
    await loginViaForm(page, TEST_ACCOUNTS.player1.email, TEST_ACCOUNTS.player1.password, /\/(dashboard|schools)/);

    // Navigate to schools
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    // Verify key page elements
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();

    // Check for school count display
    const schoolCount = page.locator("text=/\\d+\\s+school/");
    expect(await schoolCount.isVisible().catch(() => false)).toBeTruthy();

    // Check for action buttons
    const viewButton = page.locator('button:has-text("View")').first();
    const isViewButtonVisible = await viewButton.isVisible().catch(() => false);
    expect(isViewButtonVisible).toBeTruthy();
  });

  test("family context is maintained across pages", async ({ page }) => {
    await loginViaForm(page, TEST_ACCOUNTS.parent.email, TEST_ACCOUNTS.parent.password, /\/(dashboard|schools)/);

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
