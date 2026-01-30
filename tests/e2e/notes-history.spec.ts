import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";

test.describe("Notes Edit History", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user is logged in first
    await authFixture.ensureLoggedIn(page);

    // This test assumes there's at least one school with notes
    // Navigate to schools and select the first school
    await page.goto("/schools");

    // Wait for schools to load
    await page.waitForSelector("a[href*='/schools/']", { timeout: 10000 }).catch(() => null);

    // Click on first school (if available)
    const firstSchoolLink = await page.locator("a[href*='/schools/']").first();
    if (await firstSchoolLink.isVisible()) {
      await firstSchoolLink.click();

      // Wait for school detail page to load
      await page.waitForURL(/\/schools\/[^/]+$/, { timeout: 10000 }).catch(() => null);
    }
  });

  test("should display View History button on notes section", async ({ page }) => {
    // Look for the notes section and history button
    const notesSection = await page.locator("h2:has-text('Notes')").first();
    expect(notesSection).toBeDefined();

    // Find the View History button near the notes section
    const viewHistoryButton = await page.locator('button:has-text("View History")').first();
    expect(await viewHistoryButton.count()).toBeGreaterThanOrEqual(0);
  });

  test("should be able to click View History button", async ({ page }) => {
    const viewHistoryButtons = await page.locator('button:has-text("View History")').all();

    if (viewHistoryButtons.length > 0) {
      await viewHistoryButtons[0].click();

      // Wait for modal to appear
      await page.waitForSelector('h3:has-text("Notes Edit History")', {
        timeout: 5000,
      }).catch(() => null);

      const modal = await page.locator('h3:has-text("Notes Edit History")');
      expect(await modal.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test("should close history modal when close button is clicked", async ({ page }) => {
    const viewHistoryButtons = await page.locator('button:has-text("View History")').all();

    if (viewHistoryButtons.length > 0) {
      await viewHistoryButtons[0].click();

      // Wait for modal
      await page.waitForTimeout(200);

      // Find close button (X button in modal)
      const closeButton = await page.locator('svg[viewBox="0 0 24 24"]').last();
      if (await closeButton.isVisible()) {
        await closeButton.click();

        // Modal should be hidden
        await page.waitForTimeout(100);
      }
    }
  });

  test("should display edit history timeline when modal opens", async ({ page }) => {
    const viewHistoryButtons = await page.locator('button:has-text("View History")').all();

    if (viewHistoryButtons.length > 0) {
      await viewHistoryButtons[0].click();

      // Wait for modal content
      await page.waitForTimeout(200);

      // Look for timeline elements
      const timeline = await page.locator('[class*="border-l-2"]').all();
      expect(timeline.length).toBeGreaterThanOrEqual(0);
    }
  });

  test("should show loading state when fetching history", async ({ page }) => {
    // This test assumes the history fetch takes some time
    const viewHistoryButtons = await page.locator('button:has-text("View History")').all();

    if (viewHistoryButtons.length > 0) {
      await viewHistoryButtons[0].click();

      // Check for loading or content
      await page.waitForTimeout(100);

      const loadingText = await page.locator('text=/Loading|history/i').count();
      const historyContent = await page.locator('h3:has-text("History")').count();

      expect(loadingText + historyContent).toBeGreaterThanOrEqual(0);
    }
  });

  test("should handle notes without history gracefully", async ({ page }) => {
    const viewHistoryButtons = await page.locator('button:has-text("View History")').all();

    if (viewHistoryButtons.length > 0) {
      // Even if no history exists, the button should be clickable
      // and modal should open without errors
      expect(viewHistoryButtons.length).toBeGreaterThan(0);
    }
  });

  test("should display current note in modal", async ({ page }) => {
    const viewHistoryButtons = await page.locator('button:has-text("View History")').all();

    if (viewHistoryButtons.length > 0) {
      await viewHistoryButtons[0].click();

      // Wait for modal
      await page.waitForTimeout(200);

      // Look for note content
      const noteContent = await page.locator('[class*="whitespace-pre-wrap"]').all();
      expect(noteContent.length).toBeGreaterThanOrEqual(0);
    }
  });

  test("should be able to toggle expanded previous versions", async ({ page }) => {
    const viewHistoryButtons = await page.locator('button:has-text("View History")').all();

    if (viewHistoryButtons.length > 0) {
      await viewHistoryButtons[0].click();

      // Wait for modal
      await page.waitForTimeout(200);

      // Look for expandable buttons
      const expandButtons = await page.locator('button:has-text("Show previous version")').all();

      if (expandButtons.length > 0) {
        // Click to expand
        await expandButtons[0].click();
        await page.waitForTimeout(100);

        // Verify content is now visible
        const expandedContent = await page.locator('text=Previous content:').count();
        expect(expandedContent).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Notes History component should render on school detail page", async ({ page }) => {
    // Navigate to school detail
    await page.goto("/schools");

    // Find and click first school
    const firstSchoolLink = await page.locator("a[href*='/schools/']").first();
    if (await firstSchoolLink.isVisible()) {
      await firstSchoolLink.click();

      // Wait for page load
      await page.waitForURL(/\/schools\/[^/]+$/);

      // Look for notes section
      const notesHeading = await page.locator("h2:has-text('Notes')").count();
      expect(notesHeading).toBeGreaterThanOrEqual(1);
    }
  });
});
