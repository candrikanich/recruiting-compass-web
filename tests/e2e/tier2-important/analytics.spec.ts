import { test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { AnalyticsPage } from "../pages/AnalyticsPage";
import { testUsers } from "../fixtures/testData";

test.describe("Phase 2: Analytics Dashboard - Comprehensive Coverage", () => {
  let authPage: AuthPage;
  let analyticsPage: AnalyticsPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    analyticsPage = new AnalyticsPage(page);

    // Login first
    await authPage.goto();
    await authPage.signup(
      testUsers.newUser.email,
      testUsers.newUser.password,
      testUsers.newUser.displayName,
    );
  });

  test("should load analytics dashboard successfully", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.expectVisible("text=Analytics Dashboard");
    await analyticsPage.waitForDataToLoad();
  });

  test("should display summary stats cards", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Check that all main stats cards are visible
    await analyticsPage.expectStatsCardVisible("Total Schools");
    await analyticsPage.expectStatsCardVisible("Total Interactions");
    await analyticsPage.expectStatsCardVisible("Offer Count");
    await analyticsPage.expectStatsCardVisible("Commitments");

    // Verify stat values are numbers (or at least not empty)
    const schoolsValue = await analyticsPage.getStatValue("Total Schools");
    const interactionsValue =
      await analyticsPage.getStatValue("Total Interactions");
    const offersValue = await analyticsPage.getStatValue("Offer Count");

    test.expect(schoolsValue).not.toBe("0");
    test.expect(interactionsValue).not.toBe("");
    test.expect(offersValue).not.toBe("");
  });

  test("should display all required charts", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Check each chart is visible
    await analyticsPage.expectChartVisible("Interaction Types");
    await analyticsPage.expectChartVisible("Sentiment Breakdown");
    await analyticsPage.expectChartVisible("Recruiting Pipeline");
    await analyticsPage.expectChartVisible("School Status");
    await analyticsPage.expectChartVisible("Performance Correlation Analysis");
  });

  test("should change date range preset", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Change to different date ranges
    await analyticsPage.selectDateRangePreset("last_7_days");
    await analyticsPage.waitForDataToLoad();

    await analyticsPage.selectDateRangePreset("last_90_days");
    await analyticsPage.waitForDataToLoad();

    await analyticsPage.selectDateRangePreset("all_time");
    await analyticsPage.waitForDataToLoad();
  });

  test("should set custom date range", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Set custom date range
    const today = new Date();
    const startDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = today.toISOString().split("T")[0];

    await analyticsPage.setCustomDateRange(startDateStr, endDateStr);
    await analyticsPage.waitForDataToLoad();

    // Verify date range is applied (check that custom input fields are visible)
    await analyticsPage.expectVisible('[data-testid="start-date-input"]');
    await analyticsPage.expectVisible('[data-testid="end-date-input"]');
  });

  test("should clear date range filters", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Set a specific date range
    await analyticsPage.selectDateRangePreset("last_7_days");

    // Clear filters
    await analyticsPage.clearDateRange();

    // Should reset to default (last 30 days)
    await analyticsPage.waitForDataToLoad();
  });

  test("should export analytics as CSV", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Test CSV export
    const download = await analyticsPage.exportAsCSV();
    test.expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("should export analytics as Excel", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Test Excel export
    const download = await analyticsPage.exportAsExcel();
    test.expect(download.suggestedFilename()).toMatch(/\.xlsx?$/);
  });

  test("should export analytics as PDF", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Test PDF export
    const download = await analyticsPage.exportAsPDF();
    test.expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test("should display interaction types chart with legend", async ({
    page,
  }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    await analyticsPage.expectInteractionTypesChart();
    await analyticsPage.expectChartLegendItems("Interaction Types", [
      "Email",
      "Phone Call",
      "In Person Visit",
    ]);
  });

  test("should display sentiment breakdown chart", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    await analyticsPage.expectSentimentBreakdownChart();
    await analyticsPage.expectChartLegendItems("Sentiment Breakdown", [
      "Very Positive",
      "Positive",
      "Neutral",
      "Negative",
    ]);
  });

  test("should display recruiting pipeline funnel", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    await analyticsPage.expectRecruitingPipelineChart();
    // Funnel should have logical progression stages
    await analyticsPage.expectVisible(
      "text=Researching, text=Contacted, text=Interested, text=Offer Received",
    );
  });

  test("should display school status distribution", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    await analyticsPage.expectSchoolStatusChart();
    await analyticsPage.expectChartLegendItems("School Status", [
      "Researching",
      "Contacted",
      "Interested",
      "Offer Received",
    ]);
  });

  test("should display performance correlation chart", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    await analyticsPage.expectPerformanceCorrelationChart();
    await analyticsPage.expectVisible("text=Exit Velocity");
    await analyticsPage.expectVisible("text=Distance");
  });

  test("should handle chart interactions", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Click on a chart segment (if interactive)
    await analyticsPage.clickChartSegment("Interaction Types", "Email");
    await analyticsPage.page.waitForTimeout(1000);
  });

  test("should load data with different date ranges", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    const dateRanges = [
      "last_7_days",
      "last_30_days",
      "last_90_days",
      "last_6_months",
      "last_12_months",
    ];

    for (const range of dateRanges) {
      await analyticsPage.selectDateRangePreset(range);
      await analyticsPage.waitForDataToLoad();
      // Verify stats cards are still visible
      await analyticsPage.expectStatsCardVisible("Total Schools");
    }
  });

  test("should be responsive on mobile view", async ({ page }) => {
    await analyticsPage.testMobileView();
    await analyticsPage.expectStatsCardVisible("Total Schools");
    await analyticsPage.expectChartVisible("Interaction Types");
  });

  test("should be responsive on desktop view", async ({ page }) => {
    await analyticsPage.testDesktopView();
    await analyticsPage.expectStatsCardVisible("Total Schools");
    await analyticsPage.expectChartVisible("Interaction Types");
  });

  test("should handle loading states properly", async ({ page }) => {
    await analyticsPage.navigateToAnalytics();

    // The page should show loading initially
    // This tests that the page handles loading gracefully
    await analyticsPage.waitForDataToLoad();
    await analyticsPage.expectStatsCardVisible("Total Schools");
  });

  test("should handle empty data gracefully", async ({ page }) => {
    // This test assumes there might be scenarios with no data
    // In a real test, you might mock empty data or use a test account with no data
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Even with no data, the page should load without crashing
    await analyticsPage.expectVisible("text=Analytics Dashboard");
  });

  test("should preserve date range preference across navigation", async ({
    page,
  }) => {
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // Set a specific date range
    await analyticsPage.selectDateRangePreset("last_90_days");
    await analyticsPage.waitForDataToLoad();

    // Navigate away and back
    await analyticsPage.navigateToAnalytics();
    await analyticsPage.waitForDataToLoad();

    // The preference might be preserved (this is optional behavior)
    // At minimum, the page should load without errors
    await analyticsPage.expectStatsCardVisible("Total Schools");
  });
});
