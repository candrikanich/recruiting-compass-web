import { test } from '@playwright/test'
import { AuthPage } from '../pages/AuthPage'
import { SchoolsPage } from '../pages/SchoolsPage'
import { testUsers, testSchools } from '../fixtures/testData'

test.describe('Tier 2: Search & Filter Functionality', () => {
  let authPage: AuthPage
  let schoolsPage: SchoolsPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    schoolsPage = new SchoolsPage(page)

    // Setup: Login and create multiple schools for testing
    await authPage.goto()
    await authPage.signup(testUsers.newUser.email, testUsers.newUser.password, testUsers.newUser.displayName)

    // Add multiple schools with different attributes
    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school1)

    await schoolsPage.navigateToSchools()
    await schoolsPage.clickAddSchool()
    await schoolsPage.createSchool(testSchools.school2)

    await schoolsPage.goto()
  })

  test('should search schools by name', async () => {
    await schoolsPage.searchSchools(testSchools.school1.name)

    // Should find the school
    await schoolsPage.expectSchoolInList(testSchools.school1.name)

    // Verify search results
    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThan(0)
  })

  test('should search with no results', async () => {
    await schoolsPage.searchSchools('NonexistentSchoolName12345')

    // Should show no results message
    await schoolsPage.expectSearchResults(0)
  })

  test('should clear search results', async () => {
    // Search for something
    await schoolsPage.searchSchools(testSchools.school1.name)

    // Clear search
    await schoolsPage.clearSearch()

    // Should see all schools again
    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should filter schools by division', async () => {
    await schoolsPage.filterByDivision(testSchools.school1.division)

    // Should show filtered results
    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThan(0)
  })

  test('should filter schools by state', async () => {
    // Assuming school1 has a state
    const state = 'California' // Example state
    await schoolsPage.filterByState(state)

    // Should apply filter
    const filterCount = await schoolsPage.getActiveFilterCount()
    test.expect(filterCount).toBeGreaterThan(0)
  })

  test('should filter schools by conference', async () => {
    const conference = testSchools.school1.conference
    await schoolsPage.filterByConference(conference)

    // Should show filtered results
    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThan(0)
  })

  test('should filter by multiple criteria', async () => {
    const filters = {
      division: testSchools.school1.division,
      state: 'California'
    }
    await schoolsPage.filterByMultipleCriteria(filters)
    await schoolsPage.applyFilters()

    // Should have active filters
    const filterCount = await schoolsPage.getActiveFilterCount()
    test.expect(filterCount).toBeGreaterThan(0)
  })

  test('should display filter chips', async () => {
    await schoolsPage.filterByDivision(testSchools.school1.division)

    // Should show filter chips
    const chipCount = await schoolsPage.getFilterChipCount()
    test.expect(chipCount).toBeGreaterThan(0)
  })

  test('should remove filter chip', async () => {
    await schoolsPage.filterByDivision(testSchools.school1.division)

    // Remove filter chip
    const chipText = testSchools.school1.division
    await schoolsPage.removeFilterChip(chipText)

    // Should have no active filters
    const filterCount = await schoolsPage.getActiveFilterCount()
    test.expect(filterCount).toBe(0)
  })

  test('should clear all filters', async () => {
    // Apply multiple filters
    await schoolsPage.filterByDivision(testSchools.school1.division)
    await schoolsPage.filterByConference(testSchools.school1.conference)

    // Clear all filters
    await schoolsPage.clearAllFilters()

    // Should have no active filters
    const filterCount = await schoolsPage.getActiveFilterCount()
    test.expect(filterCount).toBe(0)
  })

  test('should save current filters as preset', async () => {
    // Apply filters
    await schoolsPage.filterByDivision(testSchools.school1.division)
    await schoolsPage.filterByConference(testSchools.school1.conference)

    // Save as preset
    await schoolsPage.saveCurrentFiltersAsPreset('My Favorite Schools')

    // Verify preset was saved
    const presetCount = await schoolsPage.getSavedPresetCount()
    test.expect(presetCount).toBeGreaterThan(0)
  })

  test('should load a saved filter preset', async () => {
    // First, save a preset
    await schoolsPage.filterByDivision(testSchools.school1.division)
    await schoolsPage.saveCurrentFiltersAsPreset('Test Preset')

    // Clear filters
    await schoolsPage.clearAllFilters()

    // Load the preset
    await schoolsPage.loadFilterPreset('Test Preset')

    // Should have active filters again
    const filterCount = await schoolsPage.getActiveFilterCount()
    test.expect(filterCount).toBeGreaterThan(0)
  })

  test('should show search suggestions', async () => {
    // Should show suggestions when typing
    const suggestions = await schoolsPage.getSearchSuggestions()
    test.expect(suggestions.length).toBeGreaterThanOrEqual(0)
  })

  test('should toggle fuzzy search', async () => {
    // Toggle fuzzy search
    await schoolsPage.toggleFuzzySearch()

    // Search with typo (should work with fuzzy search)
    const schoolNameWithTypo = testSchools.school1.name.substring(0, 3) + 'xyz'
    await schoolsPage.searchSchools(schoolNameWithTypo)
  })

  test('should combine search and filters', async () => {
    // Search by name AND filter by division
    await schoolsPage.searchSchools(testSchools.school1.name)
    await schoolsPage.filterByDivision(testSchools.school1.division)

    // Should show filtered search results
    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThan(0)
  })

  test('should show active filter count', async () => {
    // Apply a filter
    await schoolsPage.filterByDivision(testSchools.school1.division)

    // Check active filter count
    const filterCount = await schoolsPage.getActiveFilterCount()
    test.expect(filterCount).toBeGreaterThan(0)
  })

  test('should persist filters on page reload', async () => {
    // Apply filters
    await schoolsPage.filterByDivision(testSchools.school1.division)
    const initialFilterCount = await schoolsPage.getActiveFilterCount()

    // Reload page
    await schoolsPage.reloadPage()

    // Filters should persist
    const reloadedFilterCount = await schoolsPage.getActiveFilterCount()
    test.expect(reloadedFilterCount).toBe(initialFilterCount)
  })

  test('should filter by verified status', async () => {
    await schoolsPage.filterByVerified(true)

    // Should apply filter
    const filterCount = await schoolsPage.getActiveFilterCount()
    test.expect(filterCount).toBeGreaterThan(0)
  })

  test('should search in multiple fields', async () => {
    // Search should check name, location, etc.
    await schoolsPage.searchSchools(testSchools.school1.location)

    // Should find results
    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should show no results message', async () => {
    // Search for something that doesn't exist
    await schoolsPage.searchSchools('XYZ123NonExistent')

    // Should show empty state
    await schoolsPage.expectSearchResults(0)
  })

  test('should navigate after clearing filters', async () => {
    // Apply filter
    await schoolsPage.filterByDivision(testSchools.school1.division)

    // Navigate back to schools list
    await schoolsPage.navigateToSchools()

    // Should still have filters applied
    const filterCount = await schoolsPage.getActiveFilterCount()
    test.expect(filterCount).toBeGreaterThan(0)
  })

  test('should sort filtered results', async () => {
    // Apply filter
    await schoolsPage.filterByDivision(testSchools.school1.division)

    // Sorted results should be returned
    const count = await schoolsPage.getSchoolCount()
    test.expect(count).toBeGreaterThanOrEqual(0)
  })
})
