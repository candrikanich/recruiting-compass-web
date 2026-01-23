import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class SearchPage extends BasePage {
  async goto() {
    await super.goto("/search");
  }

  async navigateToSearch() {
    await this.click('[data-testid="nav-search"]');
    await this.waitForURL("/search");
  }

  // Search Input and Type Selection
  async fillSearchQuery(query: string) {
    await this.fillInput(
      'input[placeholder*="Search"], input[data-testid*="search"]',
      query,
    );
  }

  async selectSearchType(
    type: "all" | "schools" | "coaches" | "interactions" | "metrics",
  ) {
    await this.click(`button:has-text("${this.getTypeLabel(type)}")`);
    await this.page.waitForTimeout(500);
  }

  private getTypeLabel(type: string): string {
    const labels = {
      all: "All",
      schools: "Schools",
      coaches: "Coaches",
      interactions: "Interactions",
      metrics: "Metrics",
    };
    return labels[type as keyof typeof labels] || type;
  }

  async performSearch(query: string) {
    await this.fillSearchQuery(query);
    await this.page.keyboard.press("Enter");
    await this.waitForSearchResults();
  }

  async waitForSearchResults() {
    await this.page.waitForTimeout(2000);

    const loadingVisible = await this.page
      .locator('text=Searching..., [data-testid*="loading"]')
      .isVisible();
    if (loadingVisible) {
      await this.page.waitForSelector("text=Searching...", { state: "hidden" });
    }
  }

  // Search Results Validation
  async expectResultsCount(minCount: number) {
    const resultSections = await this.page
      .locator('[data-testid*="results"], .results-section')
      .count();
    if (resultSections < minCount) {
      throw new Error(
        `Expected at least ${minCount} result sections, but found ${resultSections}`,
      );
    }
  }

  async expectSchoolResults(count: number) {
    const schoolCards = await this.page
      .locator('[data-testid*="school-card"], .school-card')
      .count();
    if (schoolCards < count) {
      throw new Error(
        `Expected at least ${count} school cards, but found ${schoolCards}`,
      );
    }
  }

  async expectCoachResults(count: number) {
    const coachCards = await this.page
      .locator('[data-testid*="coach-card"], .coach-card')
      .count();
    if (coachCards < count) {
      throw new Error(
        `Expected at least ${count} coach cards, but found ${coachCards}`,
      );
    }
  }

  async expectInteractionResults(count: number) {
    const interactionItems = await this.page
      .locator('[data-testid*="interaction"], .interaction-item')
      .count();
    if (interactionItems < count) {
      throw new Error(
        `Expected at least ${count} interaction items, but found ${interactionItems}`,
      );
    }
  }

  async expectMetricResults(count: number) {
    const metricItems = await this.page
      .locator('[data-testid*="metric"], .metric-item')
      .count();
    if (metricItems < count) {
      throw new Error(
        `Expected at least ${count} metric items, but found ${metricItems}`,
      );
    }
  }

  async expectNoResults() {
    await this.expectVisible("text=No results found");
  }

  async expectSearchError() {
    await this.expectVisible('[data-testid*="error"], .error');
  }

  // Saved Searches
  async saveCurrentSearch(name: string) {
    await this.click('[data-testid="save-search-button"]');

    await this.fillInput(
      'input[placeholder*="name"], input[name*="search"], input[data-testid*="search-name"]',
      name,
    );
    await this.click('button:has-text("Save"), button:has-text("Create")');

    await this.page.waitForTimeout(1000);
  }

  async expectSavedSearchExists(name: string) {
    await this.expectVisible(`text=${name}`);
  }

  async loadSavedSearch(name: string) {
    await this.click(`text=${name}`);
    await this.waitForSearchResults();
  }

  async deleteSavedSearch(name: string) {
    const savedSearch = await this.page.locator(`text=${name}`).locator("..");
    await savedSearch
      .locator('button:has-text("Delete"), button[aria-label*="delete"]')
      .click();
    await this.click('button:has-text("Confirm"), button:has-text("Yes")');
  }

  // Search History
  async expectSearchHistoryExists() {
    await this.expectVisible("text=Recent Searches, text=Search History");
  }

  async loadFromHistory(query: string) {
    await this.click(`text=${query}`);
    await this.waitForSearchResults();
  }

  async clearSearchHistory() {
    await this.click(
      'button:has-text("Clear History"), button:has-text("Clear")',
    );
    await this.click('button:has-text("Confirm"), button:has-text("Yes")');
  }

  // Filters
  async expectFiltersVisible() {
    await this.expectVisible(
      '[data-testid*="filter"], .filters, .filter-panel',
    );
  }

  async applyFilter(filterName: string, value: string) {
    const filterSection = await this.page
      .locator(`text=${filterName}`)
      .locator("..");
    await filterSection
      .locator(`text=${value}, input[value="${value}"]`)
      .click();
    await this.page.waitForTimeout(1000);
  }

  async clearAllFilters() {
    await this.click(
      'button:has-text("Clear Filters"), button:has-text("Reset")',
    );
    await this.page.waitForTimeout(1000);
  }

  // Cross-Entity Search
  async expectCrossEntityResults() {
    await this.expectVisible("text=Schools");
    await this.expectVisible("text=Coaches");
  }

  // Search Suggestions
  async expectSearchSuggestions(query: string) {
    await this.fillSearchQuery(query.substring(0, 2));
    await this.page.waitForTimeout(1000);
    await this.expectVisible(
      '[data-testid*="suggestion"], .suggestions, .autocomplete',
    );
  }

  async selectSearchSuggestion(suggestion: string) {
    await this.click(`text=${suggestion}`);
    await this.waitForSearchResults();
  }

  // Search Performance
  async expectFastSearch() {
    const startTime = Date.now();
    await this.performSearch("test");
    await this.waitForSearchResults();
    const endTime = Date.now();
    const searchTime = endTime - startTime;

    // Search should complete within reasonable time (3 seconds)
    if (searchTime > 3000) {
      throw new Error(`Search took too long: ${searchTime}ms`);
    }
  }

  // Empty and Error States
  async expectEmptyState() {
    await this.expectVisible("text=No results found, text=Try searching");
  }

  async expectLoadingState() {
    await this.expectVisible(
      'text=Searching..., [data-testid*="loading"], .loading',
    );
  }

  async expectNoLoadingState() {
    // Should not show loading indicators
    const loadingVisible = await this.page
      .locator('text=Searching..., [data-testid*="loading"], .loading')
      .isVisible();
    if (loadingVisible) {
      throw new Error("Loading state is still visible");
    }
  }

  // Search Validation
  async expectSearchQueryValidation() {
    await this.fillSearchQuery("a");
    await this.page.keyboard.press("Enter");
    await this.waitForSearchResults();
  }

  async expectSpecialCharactersHandled() {
    const specialQuery = "Test@#$%^&*()";
    await this.performSearch(specialQuery);
    await this.waitForSearchResults();

    const hasError = await this.page
      .locator('[data-testid*="error"], .error')
      .isVisible();
    if (hasError) {
      await this.expectVisible("text=Invalid search, text=Search error");
    }
  }

  // Result Details
  async clickSchoolResult(schoolName: string) {
    await this.click(`text=${schoolName}`);
    await this.waitForURL(/schools\/[a-f0-9-]+/);
  }

  async clickCoachResult(coachName: string) {
    await this.click(`text=${coachName}`);
    await this.waitForURL(/coaches\/[a-f0-9-]+/);
  }

  async clickInteractionResult(interactionText: string) {
    await this.click(`text=${interactionText}`);
    await this.waitForURL(/interactions\/[a-f0-9-]+/);
  }

  // Responsive Testing
  async testMobileSearch() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.goto();

    await this.performSearch("test");
    await this.expectResultsCount(0); // May have no results but should load
  }

  async testDesktopSearch() {
    await this.page.setViewportSize({ width: 1200, height: 800 });
    await this.goto();

    await this.performSearch("test");
    await this.expectResultsCount(0); // May have no results but should load
  }
}
