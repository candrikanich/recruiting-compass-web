import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AnalyticsPage extends BasePage {
  async goto() {
    await super.goto("/analytics");
  }

  async navigateToAnalytics() {
    await this.click('[data-testid="nav-analytics"]');
    await this.waitForURL("/analytics");
  }

  // Date Range Controls
  async selectDateRangePreset(preset: string) {
    await this.selectOption('[data-testid="date-range-preset"]', preset);
    await this.page.waitForTimeout(1000); // Wait for data to load
  }

  async setCustomDateRange(startDate: string, endDate: string) {
    await this.selectDateRangePreset("custom");
    await this.fillInput('[data-testid="start-date-input"]', startDate);
    await this.fillInput('[data-testid="end-date-input"]', endDate);
    await this.click('[data-testid="apply-date-range-button"]');
    await this.page.waitForTimeout(2000); // Wait for data to refresh
  }

  async clearDateRange() {
    await this.click('[data-testid="clear-date-range-button"]');
    await this.page.waitForTimeout(1000);
  }

  // Stats Cards
  async expectStatsCardVisible(label: string) {
    await this.expectVisible(`text=${label}`);
  }

  async getStatValue(label: string): Promise<string> {
    const card = await this.page
      .locator(`text=${label}`)
      .locator("..")
      .locator("text=/\\d+/")
      .first();
    return (await card.textContent()) || "0";
  }

  async expectStatTrend(label: string, trend: "up" | "down" | "neutral") {
    const card = await this.page.locator(`text=${label}`).locator("..");
    const trendElement = await card
      .locator('[data-testid*="trend"], .trend')
      .first();

    if (trend === "up") {
      await this.expectVisible("text=↑, text=increase, text=vs last period");
    } else if (trend === "down") {
      await this.expectVisible("text=↓, text=decrease, text=vs last period");
    }
  }

  // Chart Interaction
  async expectChartVisible(title: string) {
    await this.expectVisible(`text=${title}`);
    // Check if charts are loaded - look for canvas elements within the analytics page
    const canvasCount = await this.page.locator('canvas[role="img"]').count();
    if (canvasCount === 0) {
      throw new Error(`No charts found for "${title}"`);
    }
  }

  async clickChartSegment(chartTitle: string, segmentLabel: string) {
    const chart = await this.page.locator(`text=${chartTitle}`).locator("..");
    await chart.locator(`text=${segmentLabel}`).click();
    await this.page.waitForTimeout(1000);
  }

  async expectChartLegendItems(chartTitle: string, items: string[]) {
    for (const item of items) {
      await this.expectVisible(`text=${item}`);
    }
  }

  // Export Functionality
  async exportAsCSV() {
    await this.click('[data-testid="export-csv-button"]');
    // Wait for download to start
    const download = await this.page.waitForEvent("download");
    return download;
  }

  async exportAsExcel() {
    await this.click('[data-testid="export-excel-button"]');
    const download = await this.page.waitForEvent("download");
    return download;
  }

  async exportAsPDF() {
    await this.click('[data-testid="export-pdf-button"]');
    const download = await this.page.waitForEvent("download");
    return download;
  }

  // Specific Analytics Features
  async expectInteractionTypesChart() {
    await this.expectChartVisible("Interaction Types");
    await this.expectChartLegendItems("Interaction Types", [
      "Email",
      "Phone Call",
      "In Person Visit",
    ]);
  }

  async expectSentimentBreakdownChart() {
    await this.expectChartVisible("Sentiment Breakdown");
    await this.expectChartLegendItems("Sentiment Breakdown", [
      "Very Positive",
      "Positive",
      "Neutral",
      "Negative",
    ]);
  }

  async expectRecruitingPipelineChart() {
    await this.expectChartVisible("Recruiting Pipeline");
    // Funnel charts typically have stages like Researching, Contacted, Interested, etc.
    await this.expectVisible(
      "text=Researching, text=Contacted, text=Interested",
    );
  }

  async expectSchoolStatusChart() {
    await this.expectChartVisible("School Status");
    await this.expectChartLegendItems("School Status", [
      "Researching",
      "Contacted",
      "Interested",
      "Offer Received",
    ]);
  }

  async expectPerformanceCorrelationChart() {
    await this.expectChartVisible("Performance Correlation Analysis");
    await this.expectVisible("text=Exit Velocity, text=Distance");
  }

  // Data Loading and Error Handling
  async waitForDataToLoad() {
    await this.page.waitForLoadState("networkidle");
    // Wait for stats and charts to load (look for loaded content)
    await this.expectVisible("text=Total Schools");
  }

  async expectLoadingState() {
    await this.expectVisible('[data-testid="loading"], .loading, .skeleton');
  }

  async expectNoDataState() {
    await this.expectVisible("text=No data, text=No analytics, text=Empty");
  }

  // Responsive Testing
  async testMobileView() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.goto();

    // Stats should stack vertically on mobile
    const statsCards = await this.page.locator(".grid > div").count();
    if (statsCards > 2) {
      // Check if they're in a single column
      const gridElement = await this.page.locator(".grid").first();
      const gridClasses = await gridElement.getAttribute("class");
      if (gridClasses && !gridClasses.includes("grid-cols-1")) {
        console.log("Mobile grid layout detected");
      }
    }
  }

  async testDesktopView() {
    await this.page.setViewportSize({ width: 1200, height: 800 });
    await this.goto();

    // Stats should be in a row on desktop
    await this.expectVisible(".grid-cols-2, .grid-cols-4");
  }
}
