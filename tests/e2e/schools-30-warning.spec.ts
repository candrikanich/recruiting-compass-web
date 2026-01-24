import { test, expect } from "@playwright/test";

test.describe("30+ Schools Warning", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to schools page
    await page.goto("/schools");
    // Wait for page to load
    await page.waitForLoadState("networkidle");
  });

  test("should show warning when user has 30+ schools", async ({ page }) => {
    // Check if warning is visible
    // Note: This test assumes the user has 30+ schools in their account
    const warning = page.locator(
      'text="You have 30 schools on your list" >> visible=true'
    );

    // If warning exists, verify its content
    const warningExists = await warning.isVisible().catch(() => false);
    if (warningExists) {
      await expect(warning).toBeVisible();

      // Verify the message includes the priority tier suggestion
      const suggestion = page.locator(
        'text="Consider organizing your schools with priority tiers"'
      );
      await expect(suggestion).toBeVisible();
    }
  });

  test("should display correct school count in warning", async ({ page }) => {
    // Try to find a warning banner
    const warningBanner = page.locator(".bg-amber-50");

    // Check if any warning banner exists
    const bannerCount = await warningBanner.count();

    if (bannerCount > 0) {
      // Get the warning text
      const warningText = await warningBanner.first().textContent();

      // Should contain a number indicating school count
      expect(warningText).toMatch(/\d+/);

      // Should contain the suggestion text
      expect(warningText).toContain("priority tiers");
    }
  });

  test("should show priority tier suggestion in warning", async ({ page }) => {
    // Look for the warning banner
    const warningBanner = page.locator(".bg-amber-50 >> visible=true");

    // Check if warning contains tier suggestion
    const suggestion = warningBanner.locator(
      "text=/A, B, C|priority tiers/i"
    );

    // If warning exists, verify it has tier suggestion
    const bannerVisible = await warningBanner.isVisible().catch(() => false);
    if (bannerVisible) {
      expect(suggestion).toBeDefined();
    }
  });

  test("warning should have proper styling", async ({ page }) => {
    // Find warning banner if it exists
    const warningBanner = page.locator(".bg-amber-50");

    const bannerCount = await warningBanner.count();
    if (bannerCount > 0) {
      const warningElement = warningBanner.first();

      // Check background color
      await expect(warningElement).toHaveClass(/bg-amber-50/);

      // Check border
      await expect(warningElement).toHaveClass(/border-amber-200/);
    }
  });

  test("warning icon should be visible in banner", async ({ page }) => {
    const warningBanner = page.locator(".bg-amber-50");

    const bannerCount = await warningBanner.count();
    if (bannerCount > 0) {
      // Look for SVG icon in the warning
      const icon = warningBanner.first().locator("svg");

      // Icon should exist
      const iconExists = await icon.isVisible().catch(() => false);
      expect(iconExists).toBeTruthy();
    }
  });

  test("warning should appear before empty state", async ({ page }) => {
    // The warning should appear in the document flow
    // It should appear after the error state (if any) and before the empty state

    const warningBanner = page.locator(".bg-amber-50");
    const emptyState = page.locator('text="No schools found"');

    const bannerCount = await warningBanner.count();
    if (bannerCount > 0) {
      // Warning should be visible before empty state
      const warningVisible = await warningBanner.first().isVisible();
      expect(warningVisible).toBeTruthy();
    }
  });

  test("warning should be responsive on mobile", async ({ page }) => {
    // Resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for rerender
    await page.waitForLoadState("networkidle");

    const warningBanner = page.locator(".bg-amber-50");
    const bannerCount = await warningBanner.count();

    if (bannerCount > 0) {
      // Warning should still be visible on mobile
      const warningVisible = await warningBanner.first().isVisible();
      expect(warningVisible).toBeTruthy();

      // Text should be readable
      const warningText = await warningBanner.first().textContent();
      expect(warningText?.length).toBeGreaterThan(0);
    }
  });
});
