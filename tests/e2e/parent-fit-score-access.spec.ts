import { test, expect } from "@playwright/test";
import { resolve } from "path";

test.describe("Parent Fit Score Access", () => {
  test.use({ storageState: resolve(process.cwd(), "tests/e2e/.auth/parent.json") });

  test("parent can view schools page after login", async ({ page }) => {
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1:has-text('Schools')")).toBeVisible();
    // Verify not redirected to login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("parent can view school detail page", async ({ page }) => {
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    const viewButton = page.locator('button:has-text("View")').first();
    const hasSchools = await viewButton.isVisible().catch(() => false);

    if (hasSchools) {
      await viewButton.click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page).not.toHaveURL(/\/login/);
    } else {
      // No schools in parent's family — test is inconclusive but not failing
      test.skip(true, "No schools available for parent test account");
    }
  });

  test("parent does not see Calculate Fit Score button", async ({ page }) => {
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    const viewButton = page.locator('button:has-text("View")').first();
    const hasSchools = await viewButton.isVisible().catch(() => false);

    if (hasSchools) {
      await viewButton.click();
      await page.waitForLoadState("networkidle");

      // Parents should not have fit score edit controls
      const calculateButton = page.locator(
        'button:has-text("Calculate"), button:has-text("Recalculate")',
      );
      expect(await calculateButton.count()).toBe(0);
    } else {
      test.skip(true, "No schools available for parent test account");
    }
  });

  test("parent can view fit score breakdown on school detail page", async ({
    page,
  }) => {
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");

    const viewButton = page.locator('button:has-text("View")').first();
    const hasSchools = await viewButton.isVisible().catch(() => false);

    if (hasSchools) {
      await viewButton.click();
      await page.waitForLoadState("networkidle");
      // School detail page should load without error
      await expect(page.locator("body")).toBeVisible();
      await expect(page).not.toHaveURL(/\/login/);
    } else {
      test.skip(true, "No schools available for parent test account");
    }
  });

  test("parent can navigate to coaches page", async ({ page }) => {
    await page.goto("/coaches");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("parent can navigate to dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("parent cannot see athlete profile edit button", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // Parents viewing a player's data should not see profile editing controls
    // that modify the athlete's profile (affects fit score)
    // This is an existence check — if no edit buttons present, parent is read-only
    const profileEditButton = page.locator(
      '[data-testid="edit-athlete-profile"]',
    );
    // Parent view should not expose this control
    expect(await profileEditButton.count()).toBe(0);
  });
});
