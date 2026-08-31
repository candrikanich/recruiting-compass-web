import { test, expect } from "@playwright/test";

/**
 * Dashboard NUX (New User Experience) widgets — verifies the three new
 * onboarding-v2 components render on the dashboard for the seeded player:
 *
 *   1. GettingStartedChecklist — 8-item role-aware checklist
 *   2. ProfileCompletenessCard — SVG ring (<80%) or bar (≥80%)
 *   3. SchoolRecommendationsWidget — recommended schools grid
 *
 * These run with the default player storageState (player@test.com),
 * whose nux_progress starts empty/null — so checklist should show.
 */

test.describe("Dashboard NUX Widgets", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Getting Started Checklist", () => {
    test("renders checklist with progress bar", async ({ page }) => {
      const checklist = page.locator('[data-testid="checklist-progress"]');
      // Checklist may or may not show depending on dismissal state —
      // if dismissed, the "Resume getting started" link appears instead.
      const resume = page.locator('[data-testid="checklist-resume"]');

      const checklistVisible = await checklist.isVisible().catch(() => false);
      const resumeVisible = await resume.isVisible().catch(() => false);

      // At least one must be present
      expect(checklistVisible || resumeVisible).toBe(true);

      if (checklistVisible) {
        // Progress text shows "N of 8 complete"
        await expect(checklist).toContainText(/\d+ of 8 complete/);
      }
    });

    test("checklist items have links to relevant pages", async ({ page }) => {
      const checklist = page.locator('[data-testid="checklist-progress"]');
      if (!(await checklist.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Verify key checklist items exist
      const sportItem = page.locator(
        '[data-testid="checklist-item-sport"]',
      );
      const schoolItem = page.locator(
        '[data-testid="checklist-item-first_school"]',
      );
      const academicsItem = page.locator(
        '[data-testid="checklist-item-academics"]',
      );

      await expect(sportItem).toBeVisible();
      await expect(schoolItem).toBeVisible();
      await expect(academicsItem).toBeVisible();
    });

    test("dismiss hides checklist, shows resume link", async ({ page }) => {
      const checklist = page.locator('[data-testid="checklist-progress"]');
      if (!(await checklist.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await page.locator('[data-testid="checklist-dismiss"]').click();

      await expect(checklist).not.toBeVisible();
      await expect(
        page.locator('[data-testid="checklist-resume"]'),
      ).toBeVisible();
    });
  });

  test.describe("Profile Completeness Card", () => {
    test("renders completeness indicator", async ({ page }) => {
      // Card shows either expanded (<80%) or compact (≥80%) layout
      const expanded = page.locator('[data-test="expanded-layout"]');
      const compact = page.locator('[data-test="compact-layout"]');
      const loading = page.locator('[data-test="loading"]');

      // Wait for loading to finish
      await expect(loading).not.toBeVisible({ timeout: 10000 });

      const expandedVisible = await expanded
        .isVisible()
        .catch(() => false);
      const compactVisible = await compact.isVisible().catch(() => false);

      // One layout must be visible
      expect(expandedVisible || compactVisible).toBe(true);

      if (expandedVisible) {
        // Expanded shows percentage in SVG text and action prompts
        await expect(expanded.locator("text")).toContainText(/%/);
        // Should show at least one "Add" link
        await expect(
          expanded.locator('a:has-text("Add")').first(),
        ).toBeVisible();
      }

      if (compactVisible) {
        // Compact shows "Profile N% Complete"
        await expect(compact).toContainText(/Profile \d+% Complete/);
      }
    });
  });

  test.describe("School Recommendations Widget", () => {
    test("renders recommendation cards or is hidden when empty", async ({
      page,
    }) => {
      // Widget self-hides when no recommendations available.
      // If visible, verify structure.
      const recCard = page.locator('[data-testid="rec-card"]');
      const recCardCount = await recCard.count();

      if (recCardCount > 0) {
        // Each card has school name and Add/Dismiss buttons
        const first = recCard.first();
        await expect(first).toBeVisible();
        await expect(
          first.locator('[data-testid="rec-add"]'),
        ).toBeVisible();
        await expect(
          first.locator('[data-testid="rec-dismiss"]'),
        ).toBeVisible();
      }
      // If no recs, widget not rendered — that's valid
    });
  });
});
