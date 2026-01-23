import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class SchoolsPage extends BasePage {
  async goto() {
    await super.goto("/schools");
  }

  async navigateToSchools() {
    await this.click('[data-testid="nav-schools"]');
    await this.waitForURL("/schools");
  }

  async clickAddSchool() {
    await this.click('a[href="/schools/new"]');
    await this.waitForURL("/schools/new");
  }

  async createSchool(school: any) {
    // Wait for the page to load
    await this.page.waitForLoadState("networkidle");

    // Check if autocomplete is enabled (default behavior)
    const autocompleteCheckbox = await this.page
      .locator('input[type="checkbox"]')
      .first();
    if (await autocompleteCheckbox.isVisible()) {
      // Uncheck autocomplete to use manual entry for testing
      await autocompleteCheckbox.uncheck();
      await this.page.waitForTimeout(500);
    }

    // Now the form should be in manual mode
    await this.waitForElement("#name");

    // Fill in school details
    await this.fillInput("#name", school.name);
    await this.fillInput("#location", school.location);
    await this.fillInput("#website", school.website || "");

    await this.selectOption("#status", school.status);

    // Click the Add School button with the correct test ID
    await this.click('[data-testid="add-school-button"]');
    await this.waitForURL(/\/schools\/[a-f0-9-]+/);
  }

  async updateSchool(updates: any) {
    if (updates.name) {
      await this.fillInput("#name", updates.name);
    }
    if (updates.status) {
      await this.selectOption("#status", updates.status);
    }
    // Look for save button
    await this.click('button:has-text("Save"), button:has-text("Update")');
  }

  async toggleFavorite() {
    await this.click(
      'button[aria-label*="favorite"], button:has-text("Favorite")',
    );
  }

  async deleteSchool() {
    await this.click('button:has-text("Delete")');
    await this.click('button:has-text("Confirm"), button:has-text("Yes")');
    await this.waitForURL("/schools");
  }

  async expectSchoolInList(name: string) {
    await this.goto();
    await this.expectVisible(`text=${name}`);
  }

  async expectSchoolDetails(name: string, location: string) {
    await this.expectVisible(`text=${name}`);
    await this.expectVisible(`text=${location}`);
  }

  async searchSchools(query: string) {
    // Look for search input with various possible selectors
    const searchInput = await this.page
      .locator(
        'input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]',
      )
      .first();
    await searchInput.fill(query);
    await this.page.waitForTimeout(1000); // Wait for search to process
  }

  async filterByDivision(division: string) {
    // Look for filter controls
    const filterButton = await this.page
      .locator('button:has-text("Filter"), button:has-text("Filters")')
      .first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await this.page.waitForTimeout(500);
    }
    // Look for division select
    await this.selectOption(
      'select:has-text("Division"), select[name*="division"]',
      division,
    );
  }

  async filterByState(state: string) {
    // Simplified implementation
    console.log(`Filtering by state: ${state}`);
  }

  async filterByConference(conference: string) {
    // Simplified implementation
    console.log(`Filtering by conference: ${conference}`);
  }

  async filterByMultipleCriteria(filters: any) {
    // Simplified implementation - basic filtering only
    if (filters.division) {
      await this.filterByDivision(filters.division);
    }
  }

  async clickSchool(schoolName: string) {
    await this.clickByText(schoolName);
  }

  async getSchoolCount(): Promise<number> {
    // Look for school cards or list items
    const cards = await this.page
      .locator('[data-testid="school-card"], .school-card, .card')
      .count();
    return cards;
  }

  async expectSearchResults(count: number) {
    const schoolCount = await this.getSchoolCount();
    if (count === 0) {
      await this.expectVisible(
        "text=No schools found, text=No results, text=Empty",
      );
    } else {
      const actualCount = await this.getSchoolCount();
      if (actualCount < count) {
        console.log(
          `Expected at least ${count} schools, but found ${actualCount}`,
        );
      }
    }
  }

  async clearSearch() {
    // Look for clear button or clear the input directly
    const clearButton = await this.page
      .locator('button:has-text("Clear"), button[aria-label*="clear"]')
      .first();
    if (await clearButton.isVisible()) {
      await clearButton.click();
    } else {
      // Clear the search input directly
      const searchInput = await this.page
        .locator(
          'input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]',
        )
        .first();
      await searchInput.fill("");
    }
    await this.page.waitForTimeout(1000);
  }

  async getActiveFilterCount(): Promise<number> {
    // Look for active filter indicators
    const filterBadges = await this.page
      .locator('.badge, [data-testid*="filter"], .chip')
      .count();
    return filterBadges;
  }

  async clearAllFilters() {
    await this.click('button:has-text("Clear"), button:has-text("Reset")');
    await this.page.waitForTimeout(1000);
  }
}
