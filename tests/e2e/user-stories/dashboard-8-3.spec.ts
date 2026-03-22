import { test, expect } from "@playwright/test";

test.describe("User Story 8.3 - Recent Activity Feed", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/dashboard");

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded");
  });

  test("displays Recent Activity section on dashboard", async ({ page }) => {
    // Wait for the lazy-loaded widget to mount (past Suspense fallback)
    // then verify the h3 heading is visible — use h3 to avoid strict mode violation
    const activitySection = page.locator('h3:has-text("Recent Activity")');
    await expect(activitySection).toBeVisible({ timeout: 15000 });
  });

  test.skip("shows last 10 events in feed", async ({ page }) => {
    // TODO: test account has 0 interactions. waitForSelector will timeout since no activities exist.
    // Skipped until seed data added.
    // Wait for activity feed to load
    await page.waitForSelector('[data-testid="activity-event-item"]');

    // Count activity items
    const activityItems = page.locator('[data-testid="activity-event-item"]');
    const count = await activityItems.count();

    // waitForSelector above guarantees at least 1 item; cap is 10
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(10);
  });

  test.skip("displays interaction details in feed", async ({ page }) => {
    // TODO: test account has 0 interactions. Skipped until seed data added.
    // Verify interaction events are displayed
    const activityItems = page.locator('[data-testid="activity-event-item"]');

    // Wait for at least one item
    if ((await activityItems.count()) > 0) {
      const firstItem = activityItems.first();

      // Check that interaction-like elements exist
      // (may show school name, date, type, etc.)
      const text = await firstItem.textContent();
      expect(text).toBeTruthy();
    }
  });

  test.skip("displays event icons correctly", async ({ page }) => {
    // TODO: test account has 0 interactions. Skipped until seed data added.
    const activityItems = page.locator('[data-testid="activity-event-item"]');

    if ((await activityItems.count()) > 0) {
      const firstItem = activityItems.first();
      const text = await firstItem.textContent();

      // Should contain some emoji or visual indicator
      expect(text).toMatch(/[📧☎️💬🤝💻⛺🎬🐦📱📍📄]/);
    }
  });

  test.skip("formats timestamps correctly", async ({ page }) => {
    // TODO: test account has 0 interactions. Skipped until seed data added.
    const activityItems = page.locator('[data-testid="activity-event-item"]');

    if ((await activityItems.count()) > 0) {
      const firstItem = activityItems.first();
      const text = await firstItem.textContent();

      // Should contain relative time format
      expect(text).toMatch(
        /(just now|[0-9]+[mhd] ago|[A-Z][a-z]{2} [0-9]{1,2})/,
      );
    }
  });

  test('displays "View All Activity" link', async ({ page }) => {
    const viewAllLink = page.locator("text=View All Activity");
    await expect(viewAllLink).toBeVisible();

    // Verify it's clickable
    await expect(viewAllLink).toHaveAttribute("href", "/activity");
  });

  test.skip("shows refresh button", async ({ page }) => {
    // TODO: unclear if refresh button is in design/implemented. Skipped pending verification.
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();
  });

  test.skip("refresh button works", async ({ page }) => {
    // TODO: depends on refresh button existing (see above). Skipped pending verification.
    const refreshButton = page.locator('button:has-text("Refresh")');

    // Click refresh
    await refreshButton.click();

    // Wait for potential reload
    await page
      .waitForLoadState("domcontentloaded")
      .catch(() => {});

    // Verify we're still on the page
    expect(page.url()).toContain("/dashboard");
  });

  test.skip("clicking activity navigates to details page", async ({ page }) => {
    // TODO: test account has 0 interactions. Skipped until seed data added.
    const activityItems = page.locator('[data-testid="activity-event-item"]');

    if ((await activityItems.count()) > 0) {
      const firstItem = activityItems.first();

      // Check if it's clickable (should have cursor-pointer class)
      const classes = await firstItem.getAttribute("class");

      if (classes && classes.includes("cursor-pointer")) {
        // Get the initial URL
        const initialUrl = page.url();

        // Click the item
        await firstItem.click();

        // Wait for navigation
        await page
          .waitForLoadState("domcontentloaded")
          .catch(() => {});

        // Should have navigated
        const newUrl = page.url();
        expect(newUrl).not.toBe(initialUrl);

        // Go back to dashboard
        await page.goBack();
      }
    }
  });

  test("shows empty state when no activities", async ({ page }) => {
    // Wait for the RecentActivityFeed component to mount past the Suspense fallback
    // (the h3 header renders immediately when the component is mounted)
    await expect(page.locator('h3:has-text("Recent Activity")')).toBeVisible({
      timeout: 15000,
    });
    // Now wait for the component's own data fetch to complete (spinner disappears)
    await page
      .locator(".animate-spin")
      .waitFor({ state: "detached", timeout: 10000 })
      .catch(() => {});

    const noActivityText = page.locator(
      "text=/No recent activity|Start logging/",
    );

    // Either show activities or empty state
    const hasActivities = await page
      .locator('[data-testid="activity-event-item"]')
      .count();
    const hasEmptyState = await noActivityText.count();

    expect(hasActivities > 0 || hasEmptyState > 0).toBe(true);
  });

  test("navigates to full activity page", async ({ page }) => {
    const viewAllLink = page.locator("text=View All Activity");
    await viewAllLink.click();

    // Wait for Vue Router client-side navigation to complete
    await page.waitForURL(/\/activity/, { timeout: 10000 });

    // Should show activity history page h1
    const pageTitle = page.locator("h1:has-text('Activity History')");
    await expect(pageTitle).toBeVisible();
  });
});

test.describe("Activity History Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to activity page
    await page.goto("/activity");

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded");
  });

  test("displays Activity History page", async ({ page }) => {
    const pageTitle = page.locator("text=Activity History");
    await expect(pageTitle).toBeVisible();
  });

  test.skip("shows filter options", async ({ page }) => {
    // TODO: selectors like 'label:has-text("Activity Type")' are fragile and may not match
    // actual page structure. Unclear if filter UI is implemented. Skipped pending verification.
    // Check for filter dropdowns
    const typeFilter = page.locator('label:has-text("Activity Type")').nth(0);
    const dateFilter = page.locator('label:has-text("Date Range")').nth(0);
    const searchInput = page.locator('input[placeholder*="Search"]');

    await expect(typeFilter).toBeVisible();
    await expect(dateFilter).toBeVisible();
    await expect(searchInput).toBeVisible();
  });

  test.skip("filters by activity type", async ({ page }) => {
    // TODO: filter UI may not be implemented. Skipped pending verification.
    // Select interaction type
    const typeSelect = page.locator("select").nth(0);
    await typeSelect.selectOption("interaction");

    // Wait for filter to apply
    await page.waitForLoadState("domcontentloaded");

    // Verify URL or content updated
    expect(page.url()).toContain("/activity");
  });

  test.skip("filters by date range", async ({ page }) => {
    // TODO: filter UI may not be implemented. Skipped pending verification.
    // Select last 7 days
    const dateSelect = page.locator("select").nth(1);
    await dateSelect.selectOption("week");

    // Wait for filter to apply
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).toContain("/activity");
  });

  test.skip("searches activities", async ({ page }) => {
    // TODO: search UI may not be implemented. Skipped pending verification.
    // Type in search box
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill("test");

    // Wait for search to apply
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).toContain("/activity");
  });

  test.skip("displays paginated results", async ({ page }) => {
    // TODO: `toBeDefined()` is vacuous (always true for any locator).
    // Check for pagination buttons
    const nextButton = page.locator('button:has-text("Next")');
    const prevButton = page.locator('button:has-text("Previous")');

    // If there are results, pagination should exist or be disabled
    expect(nextButton).toBeDefined();
    expect(prevButton).toBeDefined();
  });

  test.skip("paginate through results", async ({ page }) => {
    // TODO: test account has 0 interactions. Skipped until seed data added.
    const activityItems = page.locator('[data-testid="activity-event-item"]');

    // If there are activities
    if ((await activityItems.count()) > 0) {
      const initialCount = await activityItems.count();

      const nextButton = page.locator('button:has-text("Next")');
      const isNextEnabled = await nextButton.isEnabled();

      if (isNextEnabled) {
        await nextButton.click();
        await page.waitForLoadState("domcontentloaded");

        // After pagination, should still have activities
        const newItems = page.locator('[data-testid="activity-event-item"]');
        expect(await newItems.count()).toBeGreaterThan(0);
      }
    }
  });
});

test.describe("Real-time Activity Updates", () => {
  test.skip("activity feed updates without manual refresh", async ({ page }) => {
    // TODO: `expect(finalCount).toBeGreaterThanOrEqual(0)` is vacuous (always true).
    // Test doesn't actually verify real-time updates.
    // Navigate to dashboard
    await page.goto("/dashboard");

    // Wait for initial load
    await page.waitForLoadState("domcontentloaded");

    // Get initial activity count
    const activityItems = page.locator('[data-testid="activity-event-item"]');
    const initialCount = await activityItems.count();

    // Note: This test would ideally trigger a new activity in another session
    // or via an API call to test real-time updates.
    // For now, we just verify the feed exists and can be displayed.

    // Wait a bit to see if any updates come in
    await page
      .waitForLoadState("domcontentloaded")
      .catch(() => {});

    // Should still have the same or more activities
    const finalCount = await activityItems.count();
    expect(finalCount).toBeGreaterThanOrEqual(0);
  });
});
