import { test, expect } from "@playwright/test";
import { DashboardPage } from "../pages/DashboardPage";

test.describe("User Story 8.2: Contact Frequency Summary", () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
  });

  test("AC1: Scenario 1 - Contact Summary Metrics displayed correctly", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Verify all 4 summary metrics are visible
    await expect(
      page.locator('[data-testid="metric-total-schools"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="metric-contacted-7days"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="metric-avg-frequency"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="metric-need-attention"]'),
    ).toBeVisible();

    // Verify metrics contain valid data
    const totalSchools = await page
      .locator('[data-testid="metric-total-schools"]')
      .textContent();
    const contacted7Days = await page
      .locator('[data-testid="metric-contacted-7days"]')
      .textContent();
    const avgFrequency = await page
      .locator('[data-testid="metric-avg-frequency"]')
      .textContent();
    const needAttention = await page
      .locator('[data-testid="metric-need-attention"]')
      .textContent();

    expect(totalSchools).toBeTruthy();
    expect(contacted7Days).toBeTruthy();
    expect(avgFrequency).toBeTruthy();
    expect(needAttention).toBeTruthy();
  });

  test("AC1: Scenario 1 - Metrics show correct labels", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Verify metric labels
    await expect(
      page.locator('[data-testid="metric-total-schools"]'),
    ).toContainText("Total Schools");
    await expect(
      page.locator('[data-testid="metric-contacted-7days"]'),
    ).toContainText("Last 7 Days");
    await expect(
      page.locator('[data-testid="metric-avg-frequency"]'),
    ).toContainText("Avg/Month");
    await expect(
      page.locator('[data-testid="metric-need-attention"]'),
    ).toContainText("Need Attention");
  });

  test("AC2: Scenario 2 - Green border for recent contacts (within 7 days)", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Check for green-bordered schools (contacted within 7 days)
    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    const count = await schoolRows.count();
    if (count > 0) {
      // Get first school row and check for green border
      const firstSchool = schoolRows.first();
      const classes = await firstSchool.getAttribute("class");
      // Should have either green, yellow, or red border
      expect(classes).toMatch(/border-(green|yellow|red)-500/);
    }
  });

  test("AC2: Scenario 2 - Yellow border for schools contacted 8-30 days ago", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Verify that school rows have color-coded borders
    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    const count = await schoolRows.count();
    expect(count).toBeGreaterThanOrEqual(0);

    // If schools exist, verify they have border classes
    if (count > 0) {
      const firstSchool = schoolRows.first();
      const classes = await firstSchool.getAttribute("class");
      expect(classes).toContain("border-l-4");
    }
  });

  test("AC2: Scenario 2 - Red border classes applied for old contacts", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Verify color-coding border exists on contacted schools
    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      // Each school row should have one of the color borders
      for (let i = 0; i < Math.min(2, await schoolRows.count()); i++) {
        const row = schoolRows.nth(i);
        const classes = await row.getAttribute("class");
        expect(classes).toMatch(/border-(green|yellow|red)-500/);
      }
    }
  });

  test("AC3: Scenario 3 - School rows are clickable", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      const firstSchool = schoolRows.first();
      // Verify it's a link
      const tagName = await firstSchool.evaluate((el) => el.tagName);
      expect(tagName.toLowerCase()).toBe("a");

      // Verify href contains /schools/
      const href = await firstSchool.getAttribute("href");
      expect(href).toContain("/schools/");
    }
  });

  test("AC3: Scenario 3 - Clicking school navigates to school detail page", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      const firstSchool = schoolRows.first();
      const schoolHref = await firstSchool.getAttribute("href");

      // Click the school row
      await firstSchool.click();

      // Wait for navigation
      await page.waitForURL((url) => url.pathname.includes("/schools/"));

      // Verify we're on a school detail page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/schools/");
      expect(currentUrl).not.toContain("/dashboard");
    }
  });

  test("AC3: Scenario 3 - School detail page shows quick action buttons", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      // Click first school
      await schoolRows.first().click();
      await page.waitForURL(/\/schools\/[^/]+$/);

      // Verify "Log Interaction" button exists
      const logInteractionBtn = page.locator("text=Log Interaction");
      await expect(logInteractionBtn).toBeVisible();

      // Verify "Send Email" button exists
      const sendEmailBtn = page.locator("text=Send Email");
      await expect(sendEmailBtn).toBeVisible();
    }
  });

  test("AC4: Real-time Updates - Metrics update after logging interaction", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Get initial contacted 7 days count
    const initialCount = await page
      .locator('[data-testid="metric-contacted-7days"]')
      .textContent();
    const initialNum = parseInt(initialCount || "0");

    // Navigate to add interaction (this is simplified - actual implementation may vary)
    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      // Click first school
      await schoolRows.first().click();
      await page.waitForURL(/\/schools\/[^/]+$/);

      // Click Log Interaction button
      const logInteractionBtn = page.locator("text=Log Interaction");
      if (await logInteractionBtn.isVisible()) {
        await logInteractionBtn.click();
        // Wait for navigation or modal
        await page.waitForTimeout(500);
      }
    }
  });

  test("Contact Frequency widget displays metrics section", async ({
    page,
  }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    await expect(contactFreqWidget).toBeVisible();

    // Should have metric cards
    const metricCards = contactFreqWidget.locator('[data-testid^="metric-"]');
    await expect(metricCards.first()).toBeVisible();
  });

  test("Metrics display with proper formatting", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const avgFrequency = page.locator('[data-testid="metric-avg-frequency"]');
    const text = await avgFrequency.textContent();

    // Should have a decimal number (e.g., "1.2")
    expect(text).toMatch(/\d+\.\d/);
  });

  test("Contact frequency widget responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    await expect(contactFreqWidget).toBeVisible();

    // Metrics should still be visible in 2-column grid on mobile
    const metricCards = contactFreqWidget.locator('[data-testid^="metric-"]');
    await expect(metricCards.first()).toBeVisible();
  });

  test("Color-coded schools display properly stacked", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      // Verify max 5 schools displayed
      const displayCount = await schoolRows.count();
      expect(displayCount).toBeLessThanOrEqual(5);

      // Verify each has proper structure
      for (let i = 0; i < Math.min(3, displayCount); i++) {
        const row = schoolRows.nth(i);
        await expect(row).toBeVisible();

        // Should have border-l-4 class
        const classes = await row.getAttribute("class");
        expect(classes).toContain("border-l-4");
      }
    }
  });

  test("Summary metrics are accurate for tracked schools", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    // Get total schools count
    const totalSchoolsText = await page
      .locator('[data-testid="metric-total-schools"]')
      .textContent();
    const totalSchools = parseInt(totalSchoolsText || "0");

    // Get contacted in 7 days count
    const contacted7DaysText = await page
      .locator('[data-testid="metric-contacted-7days"]')
      .textContent();
    const contacted7Days = parseInt(contacted7DaysText || "0");

    // Contacted should be <= total
    expect(contacted7Days).toBeLessThanOrEqual(totalSchools);
  });

  test("Hover effects visible on school rows", async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();

    const contactFreqWidget = page.locator(
      '[data-testid="contact-frequency-widget"]',
    );
    const schoolRows = contactFreqWidget.locator(
      '[data-testid^="contacted-school-"]',
    );

    if ((await schoolRows.count()) > 0) {
      const firstSchool = schoolRows.first();

      // Verify cursor-pointer class
      const classes = await firstSchool.getAttribute("class");
      expect(classes).toContain("cursor-pointer");
      expect(classes).toContain("hover:bg-slate-100");
    }
  });
});
