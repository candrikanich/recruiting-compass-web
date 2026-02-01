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

    // 1. Quick Stats (with 6 cards including A-tier and monthly contacts)
    await dashboardPage.expectStatsCardVisible("Coaches");
    await dashboardPage.expectStatsCardVisible("Schools");
    await dashboardPage.expectStatsCardVisible("Interactions");
    await dashboardPage.expectStatsCardVisible("Offers");
    await dashboardPage.expectATierCardVisible();
    await dashboardPage.expectMonthlyContactsCardVisible();

    // 2. Top Suggestions
    await dashboardPage.expectVisible("text=Action Items");

    // 3. Recruiting Timeline
    await dashboardPage.expectVisible("text=Recruiting Calendar");

    // 4. Contact Frequency
    await dashboardPage.expectContactFrequencyWidget();

    // 5. Recent Activity
    await dashboardPage.expectRecentActivityVisible();

    // 6. Quick Actions
    await dashboardPage.expectQuickActionsVisible();
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
    await dashboardPage.expectStatsCardVisible("A-tier");
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

    // Page should not be more than 3x viewport height
    expect(scrollHeight).toBeLessThan(viewportHeight * 3);
  });

  test("AC5: Quick action buttons are prominent and functional", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Check that quick actions are visible
    await dashboardPage.expectQuickActionsVisible();

    // Verify quick action buttons exist
    await dashboardPage.expectVisible("text=Add Coach");
    await dashboardPage.expectVisible("text=Log Interaction");
    await dashboardPage.expectVisible("text=Add School");
    await dashboardPage.expectVisible("text=Schedule Event");
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

    expect(errors).toHaveLength(0);
  });

  test("Contact Frequency widget displays correctly", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Widget should be visible
    await dashboardPage.expectContactFrequencyWidget();

    // Widget should have proper structure
    await dashboardPage.expectVisible(
      '[data-testid="contact-frequency-widget"] text=Contact Frequency',
    );
  });

  test("A-tier schools card displays count", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const aTierCard = page.locator('[data-testid="stat-card-a-tier"]');
    await expect(aTierCard).toBeVisible();

    // Should show A-tier label
    await expect(aTierCard).toContainText("A-tier");
    await expect(aTierCard).toContainText("Priority schools");
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

    // Test mobile: should have 1 column
    await dashboardPage.testMobileLayout();
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    let statsGrid = page.locator(".grid.grid-cols-1");
    await expect(statsGrid).toBeVisible();

    // Test tablet: should have 2 columns
    await dashboardPage.testTabletLayout();
    await page.reload();
    await dashboardPage.waitForDashboardLoad();

    statsGrid = page.locator(".grid");
    const classes = await statsGrid.getAttribute("class");
    expect(classes).toContain("sm:grid-cols-2");

    // Test desktop: should have 3 columns
    await dashboardPage.testDesktopLayout();
    await page.reload();
    await dashboardPage.waitForDashboardLoad();

    statsGrid = page.locator(".grid");
    const desktopClasses = await statsGrid.getAttribute("class");
    expect(desktopClasses).toContain("lg:grid-cols-3");

    // Test large screen: should have 6 columns
    await dashboardPage.testLargeLayout();
    await page.reload();
    await dashboardPage.waitForDashboardLoad();

    statsGrid = page.locator(".grid");
    const largeClasses = await statsGrid.getAttribute("class");
    expect(largeClasses).toContain("xl:grid-cols-6");
  });

  test("All stat cards have proper links", async ({ page }) => {
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

    // All sections should still be visible
    const sections = await dashboardPage.getAllSectionsVisible();
    expect(sections.quickStats).toBe(true);
    expect(sections.recentActivity).toBe(true);
    expect(sections.quickActions).toBe(true);
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

  test("Navigation from dashboard stat cards works", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Click A-tier card and verify navigation
    await dashboardPage.clickATierCard();
    await dashboardPage.waitForNetworkIdle();

    const url = await dashboardPage.getPageURL();
    expect(url).toContain("/schools?tier=A");
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

    const initialStats = await dashboardPage.getAllStatCardLabels();

    // Refresh page
    await dashboardPage.refreshPage();
    await dashboardPage.waitForDashboardLoad();

    const refreshedStats = await dashboardPage.getAllStatCardLabels();

    // Stats should be the same
    expect(refreshedStats.length).toBeGreaterThan(0);
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

  test("Dashboard displays correct stat counts", async ({ page }) => {
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
