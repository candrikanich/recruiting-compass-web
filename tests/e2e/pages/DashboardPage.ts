import { Page, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto("/dashboard");
  }

  async waitForDashboardLoad() {
    await this.page.waitForLoadState("networkidle");
    await this.expectVisible("h1:has-text('Dashboard')");
  }

  async expectStatsCardVisible(label: string) {
    await this.expectVisible(`text="${label}"`);
  }

  async getStatValue(label: string): Promise<string> {
    const statCard = this.page
      .locator(`text="${label}"`)
      .locator("ancestor::a");
    const value = await statCard.locator("div").first().textContent();
    return value || "0";
  }

  async expectContactFrequencyWidget() {
    await this.expectVisible('[data-testid="contact-frequency-widget"]');
  }

  async getContactFrequencyCount(): Promise<number> {
    const text = await this.getText('[data-testid="contact-frequency-count"]');
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  async expectATierCardVisible() {
    await this.expectVisible('[data-testid="stat-card-a-tier"]');
  }

  async getATierCount(): Promise<number> {
    const element = this.page.locator('[data-testid="stat-card-a-tier"]');
    const text = await element.locator("div").nth(2).textContent();
    return text ? parseInt(text) : 0;
  }

  async expectMonthlyContactsCardVisible() {
    await this.expectVisible('[data-testid="stat-card-monthly-contacts"]');
  }

  async getMonthlyContactsCount(): Promise<number> {
    const element = this.page.locator(
      '[data-testid="stat-card-monthly-contacts"]',
    );
    const text = await element.locator("div").nth(2).textContent();
    return text ? parseInt(text) : 0;
  }

  async expectUpcomingEventsVisible() {
    await this.expectVisible("text=Upcoming Events");
  }

  async expectRecentActivityVisible() {
    await this.expectVisible("text=Recent Activity");
  }

  async expectQuickActionsVisible() {
    await this.expectVisible("text=Quick Actions");
  }

  async clickQuickAction(action: "coach" | "interaction" | "school" | "event") {
    const selectors: Record<string, string> = {
      coach: "text=Add Coach",
      interaction: "text=Log Interaction",
      school: "text=Add School",
      event: "text=Schedule Event",
    };
    await this.click(selectors[action]);
  }

  async measureLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.waitForDashboardLoad();
    return Date.now() - startTime;
  }

  async testMobileLayout() {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  async testTabletLayout() {
    await this.page.setViewportSize({ width: 768, height: 1024 });
  }

  async testDesktopLayout() {
    await this.page.setViewportSize({ width: 1024, height: 768 });
  }

  async testLargeLayout() {
    await this.page.setViewportSize({ width: 1280, height: 1024 });
  }

  async expectNoHorizontalScroll() {
    const windowWidth = await this.page.evaluate(() => window.innerWidth);
    const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth);
  }

  async getConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  async expectNoConsoleErrors() {
    let consoleErrors: string[] = [];

    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await this.waitForDashboardLoad();
    expect(consoleErrors).toHaveLength(0);
  }

  async getAllSectionsVisible() {
    const sections = {
      quickStats: await this.isVisible(".grid.grid-cols-1"),
      suggestions: await this.isVisible("text=Action Items"),
      timeline: await this.isVisible("text=Recruiting Calendar"),
      contactFrequency: await this.isVisible(
        '[data-testid="contact-frequency-widget"]',
      ),
      recentActivity: await this.isVisible("text=Recent Activity"),
      quickActions: await this.isVisible("text=Quick Actions"),
    };
    return sections;
  }

  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async getPageScrollHeight(): Promise<number> {
    return await this.page.evaluate(
      () => document.documentElement.scrollHeight,
    );
  }

  async getViewportHeight(): Promise<number> {
    return await this.page.evaluate(() => window.innerHeight);
  }

  async expectScrollHeightReason(maxRatio: number) {
    const scrollHeight = await this.getPageScrollHeight();
    const viewportHeight = await this.getViewportHeight();
    const ratio = scrollHeight / viewportHeight;
    expect(ratio).toBeLessThan(maxRatio);
  }

  async clickATierCard() {
    await this.click('[data-testid="stat-card-a-tier"]');
  }

  async clickMonthlyContactsCard() {
    await this.click('[data-testid="stat-card-monthly-contacts"]');
  }

  async getPageURL(): Promise<string> {
    return await this.getURL();
  }

  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(title);
  }

  async refreshPage() {
    await this.reloadPage();
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState("networkidle");
  }

  async countStatCards(): Promise<number> {
    return await this.getCount(".grid.grid-cols-1 a");
  }

  async getContactedSchools(): Promise<string[]> {
    const schools: string[] = [];
    const elements = await this.page
      .locator('[data-testid^="contacted-school-"]')
      .all();

    for (const element of elements) {
      const text = await element.textContent();
      if (text) {
        schools.push(text.trim());
      }
    }

    return schools;
  }

  async expectWidgetCountMatches(widgetTestId: string, expectedCount: number) {
    const countText = await this.getText(
      `${widgetTestId} [data-testid*="count"]`,
    );
    const match = countText.match(/\d+/);
    const count = match ? parseInt(match[0]) : 0;
    expect(count).toBe(expectedCount);
  }

  async getAllStatCardLabels(): Promise<string[]> {
    const labels: string[] = [];
    const elements = await this.page.locator(".grid.grid-cols-1 a").all();

    for (const element of elements) {
      const text = await element.textContent();
      if (text) {
        labels.push(text.trim());
      }
    }

    return labels;
  }

  // User Story 8.2 - Contact Frequency Summary Methods
  async getContactFrequencySummaryMetrics() {
    const totalSchools = await this.getText(
      '[data-testid="metric-total-schools"]',
    );
    const contacted7Days = await this.getText(
      '[data-testid="metric-contacted-7days"]',
    );
    const avgFrequency = await this.getText(
      '[data-testid="metric-avg-frequency"]',
    );
    const needAttention = await this.getText(
      '[data-testid="metric-need-attention"]',
    );

    return {
      totalSchools: totalSchools.match(/\d+/)?.[0] || "0",
      contacted7Days: contacted7Days.match(/\d+/)?.[0] || "0",
      avgFrequency: avgFrequency.match(/\d+\.\d+/)?.[0] || "0.0",
      needAttention: needAttention.match(/\d+/)?.[0] || "0",
    };
  }

  async clickContactSchool(schoolId: string) {
    const schoolLink = this.page.locator(
      `[data-testid="contacted-school-${schoolId}"]`,
    );
    await schoolLink.click();
    await this.page.waitForURL((url) => url.pathname.includes("/schools/"));
  }

  async expectColorCoding(
    schoolId: string,
    expectedColor: "green" | "yellow" | "red",
  ) {
    const schoolRow = this.page.locator(
      `[data-testid="contacted-school-${schoolId}"]`,
    );
    const classes = await schoolRow.getAttribute("class");
    expect(classes).toContain(`border-${expectedColor}-500`);
  }

  async expectContactSummaryMetrics() {
    await this.expectVisible('[data-testid="metric-total-schools"]');
    await this.expectVisible('[data-testid="metric-contacted-7days"]');
    await this.expectVisible('[data-testid="metric-avg-frequency"]');
    await this.expectVisible('[data-testid="metric-need-attention"]');
  }

  async getSchoolRowCount(): Promise<number> {
    return await this.getCount('[data-testid^="contacted-school-"]');
  }

  async expectMaxSchoolsDisplayed(maxCount: number = 5) {
    const count = await this.getSchoolRowCount();
    expect(count).toBeLessThanOrEqual(maxCount);
  }
}
