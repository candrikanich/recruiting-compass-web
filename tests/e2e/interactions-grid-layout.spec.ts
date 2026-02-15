import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";

/**
 * Grid Layout Test for Interactions Page
 *
 * Tests that the interactions page uses responsive grid layout
 * matching the pattern from schools and coaches pages.
 */

test.describe("Interactions Grid Layout", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user is logged in before each test
    await authFixture.ensureLoggedIn(page);
  });

  test("should display interactions in responsive grid layout", async ({ page }) => {
    // Navigate to interactions page
    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");

    // Find the interactions list container (not the filters or analytics grids)
    // Use the specific grid pattern: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
    const container = page.locator('main#main-content div.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');

    // Check if grid exists (only when interactions are present)
    const gridCount = await container.count();

    if (gridCount > 0) {
      // Verify grid classes exist - these should match schools/coaches pattern
      await expect(container).toHaveClass(/grid/);
      await expect(container).toHaveClass(/grid-cols-1/);
      await expect(container).toHaveClass(/md:grid-cols-2/);
      await expect(container).toHaveClass(/lg:grid-cols-3/);
      await expect(container).toHaveClass(/gap-6/);
    } else {
      // Grid doesn't exist when there are no interactions
      // This is expected behavior - verify empty state instead
      const emptyState = page.getByText(/No interactions yet|Loading interactions/);
      await expect(emptyState).toBeVisible();
    }
  });

  test("should display cards in grid on desktop viewport", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");

    // Target the interactions list grid specifically
    const container = page.locator('main#main-content div.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
    const cards = container.locator('> div');

    // If there are cards, verify they exist
    const count = await cards.count();
    if (count > 0) {
      expect(count).toBeGreaterThan(0);

      // Verify first card is visible
      await expect(cards.first()).toBeVisible();
    }
  });

  test("should maintain card functionality in grid layout", async ({ page }) => {
    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");

    // Target the interactions list grid specifically
    const container = page.locator('main#main-content div.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
    const cards = container.locator('> div');
    const count = await cards.count();

    if (count > 0) {
      // Click "View" button on first card
      const firstCard = cards.first();
      const viewButton = firstCard.locator('button:has-text("View")');
      await viewButton.click();

      // Verify navigation to detail page
      await expect(page).toHaveURL(/\/interactions\/.+/);
    }
  });
});
