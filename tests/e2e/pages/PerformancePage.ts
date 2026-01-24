import { BasePage } from "./BasePage";

export class PerformancePage extends BasePage {
  async goto() {
    await super.goto("/performance");
  }

  async navigateToPerformance() {
    await this.click('[data-testid="nav-performance"]');
    await this.waitForURL("/performance");
  }

  async clickAddMetric() {
    await this.clickByText("Log Metric");
    await this.waitForURL(/performance\/new/);
  }

  async logMetric(metric: any) {
    // Select metric type
    await this.selectOption('[data-testid="metric-type-select"]', metric.type);

    // Fill value
    await this.fillInput(
      '[data-testid="metric-value-input"]',
      metric.value.toString(),
    );

    // Select date
    await this.fillInput('[data-testid="date-input"]', metric.date);

    // Add notes if provided
    if (metric.notes) {
      await this.fillInput('[placeholder*="notes"]', metric.notes);
    }

    await this.clickByText("Log Metric");
    await this.page.waitForLoadState("networkidle");
  }

  async expectMetricLogged(metricType: string, value: string) {
    await this.goto();
    await this.expectVisible(`text=${metricType}`);
    await this.expectVisible(`text=${value}`);
  }

  async viewChart(metricType: string) {
    await this.click(`[data-testid="chart-${metricType}"]`);
  }

  async viewTrend(metricType: string) {
    await this.click(`[data-testid="trend-${metricType}"]`);
  }

  async getPeakVelocity(): Promise<string> {
    return await this.getText('[data-testid="peak-velocity"]');
  }

  async getAverageVelocity(): Promise<string> {
    return await this.getText('[data-testid="average-velocity"]');
  }

  async getTrend(metricType: string): Promise<string> {
    return await this.getText(`[data-testid="trend-${metricType}"]`);
  }

  async filterByMetricType(type: string) {
    await this.click('[data-testid="filter-button"]');
    await this.selectOption('[data-testid="type-filter"]', type);
  }

  async filterByDateRange(startDate: string, endDate: string) {
    await this.click('[data-testid="date-range-button"]');
    await this.fillInput('[data-testid="start-date-input"]', startDate);
    await this.fillInput('[data-testid="end-date-input"]', endDate);
  }

  async comparePerformance() {
    await this.click('[data-testid="compare-button"]');
    await this.waitForURL(/performance\/compare/);
  }

  async getMetricCount(): Promise<number> {
    return await this.getCount('[data-testid="metric-item"]');
  }

  async deleteMetric(metricType: string) {
    await this.click(
      `[data-testid="metric-${metricType}"] [data-testid="delete-button"]`,
    );
    await this.clickByText("Confirm Delete");
  }

  async exportPerformanceData(format: string) {
    await this.click('[data-testid="export-button"]');
    await this.clickByText(format);
    await this.page.waitForEvent("download");
  }

  async viewAnalyticsDashboard() {
    await this.click('[data-testid="analytics-tab"]');
    await this.expectVisible('[data-testid="velocity-chart"]');
    await this.expectVisible('[data-testid="trend-analysis"]');
  }
}
