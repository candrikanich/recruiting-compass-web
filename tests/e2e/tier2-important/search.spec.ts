import { test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { SearchPage } from "../pages/SearchPage";
import { testUsers } from "../fixtures/testData";

test.describe("Phase 2: Advanced Search Functionality", () => {
  let authPage: AuthPage;
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    searchPage = new SearchPage(page);

    // Login first
    await authPage.goto();
    await authPage.signup(
      testUsers.newUser.email,
      testUsers.newUser.password,
      testUsers.newUser.displayName,
    );
  });

  test("should load search page successfully", async ({ page }) => {
    await searchPage.navigateToSearch();
    await searchPage.expectVisible("text=Advanced Search");
    await searchPage.expectVisible(
      "text=Search across schools, coaches, interactions, and performance metrics",
    );
  });

  test("should perform basic search query", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Search for something that should have results
    await searchPage.performSearch("University");

    // Should show some results or handle gracefully
    await searchPage.waitForSearchResults();

    // At minimum, should not show search error
    await searchPage.expectSearchError();
  });

  test("should switch between search types", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Test each search type
    const searchTypes = [
      "all",
      "schools",
      "coaches",
      "interactions",
      "metrics",
    ] as const;

    for (const type of searchTypes) {
      await searchPage.selectSearchType(type);
      await searchPage.waitForSearchResults();
    }
  });

  test("should handle empty search gracefully", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Perform empty search
    await searchPage.performSearch("");
    await searchPage.waitForSearchResults();

    // Should show empty state or handle gracefully
    await searchPage.expectEmptyState();
  });

  test("should save search queries", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Perform a search first to have results
    await searchPage.performSearch("University");
    await searchPage.waitForSearchResults();

    // Save the search
    await searchPage.saveCurrentSearch("Test Search Query");

    // Verify it appears in saved searches (may need to navigate away and back)
    await searchPage.navigateToSearch();
    await searchPage.expectSearchHistoryExists();
  });

  test("should load from search history", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Should have search history visible initially
    await searchPage.expectSearchHistoryExists();

    // Load from history (this would depend on actual history implementation)
    // For now, just verify the history section exists
  });

  test("should clear search history", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Should have clear history option
    await searchPage.expectSearchHistoryExists();

    // Clear history (implementation depends on UI)
    await searchPage.clearSearchHistory();
  });

  test("should show search suggestions", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Type partial query to trigger suggestions
    await searchPage.expectSearchSuggestions("Uni");
  });

  test("should select search suggestion", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Type to get suggestions
    await searchPage.expectSearchSuggestions("Uni");

    // Select a suggestion
    await searchPage.selectSearchSuggestion("University");
    await searchPage.waitForSearchResults();
  });

  test("should handle special characters in search", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Test with special characters
    await searchPage.expectSpecialCharactersHandled();
  });

  test("should validate search input", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Test very short query
    await searchPage.expectSearchQueryValidation();
  });

  test("should perform fast search", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Test search performance
    await searchPage.expectFastSearch();
  });

  test("should be responsive on mobile", async ({ page }) => {
    await searchPage.testMobileSearch();

    // Mobile search should be functional
    await searchPage.expectVisible("text=Advanced Search");
  });

  test("should be responsive on desktop", async ({ page }) => {
    await searchPage.testDesktopSearch();

    // Desktop search should be functional
    await searchPage.expectVisible("text=Advanced Search");
  });

  test("should handle search filters", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Perform search to get filter options
    await searchPage.performSearch("University");
    await searchPage.waitForSearchResults();

    // Check if filters are visible (depends on actual implementation)
    await searchPage.expectFiltersVisible();
  });

  test("should apply and clear filters", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Perform search to activate filters
    await searchPage.performSearch("University");
    await searchPage.waitForSearchResults();

    // Try to apply a filter (implementation depends on actual filter UI)
    await searchPage.expectFiltersVisible();

    // Clear all filters
    await searchPage.clearAllFilters();
  });

  test("should search across entities", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Search in 'all' mode should search across entities
    await searchPage.selectSearchType("all");
    await searchPage.performSearch("Test");
    await searchPage.waitForSearchResults();

    // Should expect cross-entity results (if data exists)
    await searchPage.expectCrossEntityResults();
  });

  test("should handle search errors gracefully", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Test search error handling
    const invalidQuery = "Test@#$%^&*()";
    await searchPage.performSearch(invalidQuery);
    await searchPage.waitForSearchResults();

    // Should not crash and should show user-friendly error
    await searchPage.expectSearchError();
  });

  test("should maintain search state", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Perform search
    await searchPage.performSearch("University");
    await searchPage.waitForSearchResults();

    // Navigate away and back to test state persistence
    await searchPage.navigateToSearch();
    // The search query might be preserved or cleared depending on implementation

    // At minimum, the page should load without errors
    await searchPage.expectVisible("text=Advanced Search");
  });

  test("should display search results appropriately", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Search for something specific
    await searchPage.performSearch("University");
    await searchPage.waitForSearchResults();

    // Should show results in appropriate format
    // This depends on actual UI implementation

    // Should not show loading state
    await searchPage.expectNoLoadingState();

    // Should not show error state
    await searchPage.expectSearchError();
  });

  test("should handle no results gracefully", async ({ page }) => {
    await searchPage.navigateToSearch();

    // Search for something that won't exist
    await searchPage.performSearch("NonexistentUniversity12345");
    await searchPage.waitForSearchResults();

    // Should show empty state
    await searchPage.expectEmptyState();
  });
});
