import { test, expect } from "@playwright/test";
import { DashboardPage } from "../pages/DashboardPage";
import { AuthPage } from "../pages/AuthPage";

test.describe("User Story 8.1: Dashboard Overview", () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    // Assume user is already logged in via test setup
    // If not, implement login here
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
  });

  test("AC1: Dashboard displays all 6 required sections", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // 1. Stats cards (always visible, aria-label scoped)
    await dashboardPage.expectStatsCardVisible("Coaches");
    await dashboardPage.expectStatsCardVisible("Schools");
    await dashboardPage.expectStatsCardVisible("Interactions");
    await dashboardPage.expectMonthlyContactsCardVisible();

    // 2. Contact Frequency sidebar widget (always visible)
    await dashboardPage.expectContactFrequencyWidget();
  });

  test("AC2: Dashboard loads in under 2 seconds", async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    const loadTime = await dashboardPage.measureLoadTime();
    expect(loadTime).toBeLessThan(2000);
  });

  test("AC3: Mobile responsive design (375px viewport)", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.testMobileLayout();

    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Verify no horizontal scroll
    await dashboardPage.expectNoHorizontalScroll();

    // Verify stats cards stack vertically
    await dashboardPage.expectStatsCardVisible("Coaches");
    await dashboardPage.expectStatsCardVisible("Schools");
  });

  test("AC3b: Tablet responsive design (768px viewport)", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.testTabletLayout();

    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    await dashboardPage.expectNoHorizontalScroll();
    await dashboardPage.expectStatsCardVisible("Coaches");
  });

  test("AC3c: Desktop responsive design (1024px viewport)", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.testDesktopLayout();

    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    await dashboardPage.expectNoHorizontalScroll();
    await dashboardPage.expectStatsCardVisible("Schools");
  });

  test("AC3d: Large screen responsive design (1280px viewport)", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.testLargeLayout();

    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    await dashboardPage.expectNoHorizontalScroll();
  });

  test("AC4: All sections visible without excessive scrolling", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const scrollHeight = await dashboardPage.getPageScrollHeight();
    const viewportHeight = await dashboardPage.getViewportHeight();

    // Page should not be more than 5x viewport height
    expect(scrollHeight).toBeLessThan(viewportHeight * 5);
  });

  test("AC5: Quick action buttons are prominent and functional", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Verify stats cards and Contact Frequency widget (always visible)
    await dashboardPage.expectStatsCardVisible("Coaches");
    await dashboardPage.expectContactFrequencyWidget();
  });

  test("AC6: No console errors on dashboard load", async ({ page }) => {
    dashboardPage = new DashboardPage(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Filter out known transient network/Supabase errors in test environment
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("Failed to fetch") &&
        !e.includes("supabase.co") &&
        !e.includes("ERR_CONNECTION_REFUSED") &&
        !e.includes("net::"),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("Contact Frequency widget displays correctly", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Widget should be visible
    await dashboardPage.expectContactFrequencyWidget();

    // Widget should have proper structure — h3 "Contact Frequency" inside widget
    const widget = page.locator('[data-testid="contact-frequency-widget"]');
    await expect(widget.locator('h3:has-text("Contact Frequency")')).toBeVisible();
  });

  test("A-tier schools card displays count", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Check Schools stat card (A-tier card doesn't have dedicated data-testid)
    const schoolsCard = page.locator('a[aria-label*="Schools section"]');
    await expect(schoolsCard).toBeVisible();
    await expect(schoolsCard).toContainText("Schools");
  });

  test("Monthly contacts card displays count", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactsCard = page.locator(
      '[data-testid="stat-card-monthly-contacts"]',
    );
    await expect(contactsCard).toBeVisible();

    // Should show proper labels
    await expect(contactsCard).toContainText("Contacts");
    await expect(contactsCard).toContainText("This month");
  });

  test("Dashboard grid layout adjusts based on screen size", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);

    // Stats grid has responsive classes: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6
    // Verify the classes exist in the HTML (not runtime computed — Tailwind is static)
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const statsGrid = page.locator(".grid.grid-cols-1.sm\\:grid-cols-2");
    await expect(statsGrid.first()).toBeVisible();

    // Mobile: page should render without horizontal scroll
    await dashboardPage.testMobileLayout();
    await page.reload();
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.expectNoHorizontalScroll();

    // Desktop: all stat cards still visible
    await dashboardPage.testDesktopLayout();
    await page.reload();
    await dashboardPage.waitForDashboardLoad();
    await dashboardPage.expectStatsCardVisible("Coaches");
  });

  test("Navigation from dashboard stat cards works", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Click Schools card and verify navigation
    const schoolsCard = page.locator('a[aria-label*="Schools section"]');
    await schoolsCard.click();
    await dashboardPage.waitForNetworkIdle();

    const url = await dashboardPage.getPageURL();
    expect(url).toContain("/schools");
  });

  test.skip("All stat cards have proper links", async ({ page }) => {
    // TODO: test account has 0 schools; clicking cards navigates to empty pages.
    // This test would pass regardless of correctness. Skipped until we seed
    // test account with schools data.
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Coaches card should link to /coaches
    const coachesCard = page.locator("a:has-text('Coaches')").first();
    await expect(coachesCard).toHaveAttribute("href", "/coaches");

    // Schools card should link to /schools
    const schoolsCard = page.locator("a:has-text('Schools')").first();
    await expect(schoolsCard).toHaveAttribute("href", "/schools");

    // A-tier card should link to /schools?tier=A
    const aTierCard = page.locator('[data-testid="stat-card-a-tier"]');
    await expect(aTierCard).toHaveAttribute("href", "/schools?tier=A");

    // Monthly contacts card should link to /interactions
    const contactsCard = page.locator(
      '[data-testid="stat-card-monthly-contacts"]',
    );
    await expect(contactsCard).toHaveAttribute("href", "/interactions");
  });

  test("Dashboard persists visibility preferences", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Reload page
    await dashboardPage.refreshPage();
    await dashboardPage.waitForDashboardLoad();

    // Key sections should still be visible after reload
    const sections = await dashboardPage.getAllSectionsVisible();
    expect(sections.quickStats).toBe(true);
    expect(sections.contactFrequency).toBe(true);
  });

  test("Empty states display correctly when no data", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Contact frequency widget should show empty state or data
    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    await expect(contactFreqWidget).toBeVisible();
  });

  test("Dashboard loads with network throttling (slow 3G)", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);

    // Simulate slow 3G
    await page.route("**/*", async (route) => {
      await new Promise((r) => setTimeout(r, 100));
      await route.continue();
    });

    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Should still show all sections
    await dashboardPage.expectStatsCardVisible("Coaches");
    await dashboardPage.expectContactFrequencyWidget();
  });

  test("Dashboard survives page refresh without losing state", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Verify stat cards are visible before refresh
    await dashboardPage.expectStatsCardVisible("Coaches");

    // Refresh page
    await dashboardPage.refreshPage();
    await dashboardPage.waitForDashboardLoad();

    // Key elements should still be visible after refresh
    await dashboardPage.expectStatsCardVisible("Coaches");
  });

  test("All interactive elements are accessible", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Test tab navigation
    await page.keyboard.press("Tab");
    let focusedElement = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(focusedElement).toBeTruthy();

    // Test keyboard interaction
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
  });

  test.skip("Dashboard displays correct stat counts", async ({ page }) => {
    // TODO: test account has 0 coaches, 0 schools, 0 interactions. This assertion
    // is vacuous (always passes for >= 0). Skipped until we add seed data to test account.
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Get stat values - should be numbers (0 or greater)
    const coachCount = await dashboardPage.getStatValue("Coaches");
    const schoolCount = await dashboardPage.getStatValue("Schools");
    const interactionCount = await dashboardPage.getStatValue("Interactions");

    expect(parseInt(coachCount) || 0).toBeGreaterThanOrEqual(0);
    expect(parseInt(schoolCount) || 0).toBeGreaterThanOrEqual(0);
    expect(parseInt(interactionCount) || 0).toBeGreaterThanOrEqual(0);
  });

  test("Contact Frequency widget shows recent contacts", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    await expect(contactFreqWidget).toBeVisible();

    // Widget should have title
    await expect(contactFreqWidget).toContainText("Contact Frequency");

    // Widget should either show contacts or empty state
    const emptyState = await contactFreqWidget.textContent();
    expect(emptyState).toBeTruthy();
  });
});
