import { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class SchoolsPage extends BasePage {
  async goto() {
    await super.goto('/schools')
  }

  async navigateToSchools() {
    await this.click('[data-testid="nav-schools"]')
    await this.waitForURL('/schools')
  }

  async clickAddSchool() {
    await this.clickByText('Add School')
    await this.waitForURL('/schools/new')
  }

  async createSchool(school: any) {
    await this.fillInput('input[placeholder*="name"]', school.name)
    await this.fillInput('input[placeholder*="location"]', school.location)
    await this.fillInput('input[placeholder*="website"]', school.website || '')

    await this.selectOption('[data-testid="division-select"]', school.division)
    await this.selectOption('[data-testid="conference-select"]', school.conference)
    await this.selectOption('[data-testid="status-select"]', school.status)

    await this.clickByText('Create School')
    await this.waitForURL(/\/schools\/[a-f0-9-]+/)
  }

  async updateSchool(updates: any) {
    if (updates.name) {
      await this.fillInput('input[placeholder*="name"]', updates.name)
    }
    if (updates.ranking) {
      await this.fillInput('input[placeholder*="ranking"]', updates.ranking.toString())
    }

    await this.clickByText('Save Changes')
  }

  async toggleFavorite() {
    await this.click('[data-testid="favorite-button"]')
  }

  async deleteSchool() {
    await this.clickByText('Delete')
    await this.clickByText('Confirm Delete')
    await this.waitForURL('/schools')
  }

  async expectSchoolInList(name: string) {
    await this.goto()
    await this.expectVisible(`text=${name}`)
  }

  async expectSchoolDetails(name: string, location: string) {
    await this.expectVisible(`text=${name}`)
    await this.expectVisible(`text=${location}`)
  }

  async searchSchools(query: string) {
    await this.fillInput('[data-testid="search-input"]', query)
    await this.page.waitForLoadState('networkidle')
  }

  async filterByDivision(division: string) {
    await this.click('[data-testid="filter-button"]')
    await this.selectOption('[data-testid="division-filter"]', division)
  }

  async filterByState(state: string) {
    await this.openAdvancedFilters()
    await this.selectOption('[data-testid="state-filter"]', state)
  }

  async filterByConference(conference: string) {
    await this.openAdvancedFilters()
    await this.selectOption('[data-testid="conference-filter"]', conference)
  }

  async filterByVerified(verified: boolean) {
    await this.openAdvancedFilters()
    await this.click(`input[data-testid="verified-filter"][value="${verified}"]`)
  }

  async filterByMultipleCriteria(filters: any) {
    await this.openAdvancedFilters()
    if (filters.division) {
      await this.selectOption('[data-testid="division-filter"]', filters.division)
    }
    if (filters.state) {
      await this.selectOption('[data-testid="state-filter"]', filters.state)
    }
    if (filters.conference) {
      await this.selectOption('[data-testid="conference-filter"]', filters.conference)
    }
  }

  async openAdvancedFilters() {
    const filterButton = await this.page.$('[data-testid="advanced-filters-button"]')
    if (filterButton) {
      await this.click('[data-testid="advanced-filters-button"]')
      await this.page.waitForSelector('[data-testid="advanced-filters-panel"]', { timeout: 5000 })
    }
  }

  async applyFilters() {
    await this.clickByText('Apply Filters')
    await this.page.waitForLoadState('networkidle')
  }

  async clearAllFilters() {
    await this.clickByText('Clear Filters')
    await this.page.waitForLoadState('networkidle')
  }

  async getFilterChipCount(): Promise<number> {
    return await this.getCount('[data-testid="filter-chip"]')
  }

  async removeFilterChip(chipText: string) {
    await this.click(`[data-testid="filter-chip-close"]:has-text("${chipText}")`)
    await this.page.waitForLoadState('networkidle')
  }

  async expectFilterChipVisible(chipText: string) {
    await this.expectVisible(`[data-testid="filter-chip"]:has-text("${chipText}")`)
  }

  async saveCurrentFiltersAsPreset(presetName: string) {
    await this.click('[data-testid="save-filters-button"]')
    await this.fillInput('[data-testid="preset-name-input"]', presetName)
    await this.clickByText('Save Preset')
    await this.page.waitForLoadState('networkidle')
  }

  async loadFilterPreset(presetName: string) {
    await this.click('[data-testid="saved-filters-button"]')
    await this.clickByText(presetName)
    await this.page.waitForLoadState('networkidle')
  }

  async getSavedPresetCount(): Promise<number> {
    await this.click('[data-testid="saved-filters-button"]')
    const count = await this.getCount('[data-testid="filter-preset"]')
    await this.click('[data-testid="saved-filters-button"]') // Close menu
    return count
  }

  async getSearchSuggestions(): Promise<string[]> {
    await this.fillInput('[data-testid="search-input"]', 'a')
    await this.page.waitForSelector('[data-testid="search-suggestion"]', { timeout: 5000 })
    return await this.page.locator('[data-testid="search-suggestion"]').allTextContents()
  }

  async toggleFuzzySearch() {
    await this.click('[data-testid="fuzzy-search-toggle"]')
  }

  async getActiveFilterCount(): Promise<number> {
    const badge = await this.page.$('[data-testid="active-filters-badge"]')
    if (!badge) return 0
    const text = await badge.textContent()
    return parseInt(text || '0')
  }

  async clickSchool(schoolName: string) {
    await this.clickByText(schoolName)
  }

  async getSchoolCount(): Promise<number> {
    return await this.getCount('[data-testid="school-card"]')
  }

  async expectSearchResults(count: number) {
    const schoolCount = await this.getSchoolCount()
    if (count === 0) {
      await this.expectVisible('[data-testid="no-results-message"]')
    } else {
      const actualCount = await this.getSchoolCount()
      if (actualCount !== count) {
        throw new Error(`Expected ${count} schools, but found ${actualCount}`)
      }
    }
  }

  async clearSearch() {
    await this.click('[data-testid="search-clear-button"]')
    await this.page.waitForLoadState('networkidle')
  }
}
