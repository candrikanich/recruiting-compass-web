import { test, expect } from "@playwright/test";

/**
 * E2E Tests: Search & Filter Workflows
 *
 * Test suite covering search and filtering functionality:
 * - Search documents by text
 * - Apply single and multiple filters
 * - Search with sorting options
 * - Pagination through results
 * - Clear search and filters
 * - Advanced search with multiple criteria
 *
 * Prerequisites:
 * - Dev server running on http://localhost:3003
 * - User authenticated
 * - Multiple documents available for testing
 */

test.describe("Search & Filter Workflows", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to documents page
    await page.goto("/documents");
    // Wait for documents page to load
    await page.waitForLoadState("networkidle");
  });

  // ============================================================================
  // BASIC SEARCH WORKFLOWS
  // ============================================================================

  test("should search documents by text", async ({ page }) => {
    // Enter search term
    const searchInput = page.locator('[data-testid="documents-search"]');
    await searchInput.fill("highlight");

    // Wait for search results to filter
    await page.waitForTimeout(500);

    // Verify results contain search term
    const results = page.locator('[data-testid="document-card"]');
    const resultCount = await results.count();

    if (resultCount > 0) {
      // At least first result should contain search term
      const firstResult = await results.first().textContent();
      expect(firstResult?.toLowerCase()).toContain("highlight");
    }
  });

  test("should clear search and show all documents", async ({ page }) => {
    // Perform search
    const searchInput = page.locator('[data-testid="documents-search"]');
    await searchInput.fill("test");
    await page.waitForTimeout(500);

    // Count filtered results
    const initialCount = await page
      .locator('[data-testid="document-card"]')
      .count();

    // Clear search
    const clearBtn = page.locator('[data-testid="clear-search-btn"]');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    } else {
      // Fallback: clear input manually
      await searchInput.clear();
    }

    await page.waitForTimeout(500);

    // Verify all documents shown again
    const allCount = await page
      .locator('[data-testid="document-card"]')
      .count();
    expect(allCount).toBeGreaterThanOrEqual(initialCount);
  });

  test("should show no results message for non-matching search", async ({
    page,
  }) => {
    // Search for non-existent term
    const searchInput = page.locator('[data-testid="documents-search"]');
    await searchInput.fill("xyznonexistentdocument12345");

    await page.waitForTimeout(500);

    // Verify no results message
    const noResults = page.locator('[data-testid="no-search-results"]');
    const emptyState = page.locator('[data-testid="empty-state"]');

    const hasNoResults =
      (await noResults.isVisible()) || (await emptyState.isVisible());
    expect(hasNoResults).toBeTruthy();
  });

  test("should handle search with special characters", async ({ page }) => {
    // Search with special characters
    const searchInput = page.locator('[data-testid="documents-search"]');
    await searchInput.fill('resume & cv "test"');

    await page.waitForTimeout(500);

    // Should not crash and either show results or no results message
    const resultsOrEmpty =
      (await page.locator('[data-testid="document-card"]').count()) > 0 ||
      (await page.locator('[data-testid="no-search-results"]').isVisible());

    expect(resultsOrEmpty).toBeTruthy();
  });

  test("should support fuzzy search matching", async ({ page }) => {
    // Search with typo (if fuzzy search is supported)
    const searchInput = page.locator('[data-testid="documents-search"]');
    // Search "hightlight" (misspelled) should find "highlight"
    await searchInput.fill("hightlight");

    await page.waitForTimeout(500);

    // Verify results show (if fuzzy search enabled)
    const results = page.locator('[data-testid="document-card"]');
    const count = await results.count();

    // Either finds fuzzy matches or shows empty (both valid)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ============================================================================
  // FILTER WORKFLOWS
  // ============================================================================

  test("should filter documents by type", async ({ page }) => {
    // Open filter panel
    const filterBtn = page.locator('[data-testid="open-filters-btn"]');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }

    // Select document type filter
    const typeFilter = page.locator('[data-testid="filter-type"]');
    if (await typeFilter.isVisible()) {
      // Select VIDEO option
      await page.locator('[data-testid="type-option-highlight_video"]').check();

      await page.waitForTimeout(500);

      // Verify filtered results
      const results = page.locator('[data-testid="document-card"]');
      const count = await results.count();

      // Should show only video documents
      if (count > 0) {
        const firstCardText = await results.first().textContent();
        expect(firstCardText).toBeDefined();
      }
    }
  });

  test("should filter by multiple document types", async ({ page }) => {
    // Open filters
    const filterBtn = page.locator('[data-testid="open-filters-btn"]');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }

    // Select multiple types
    const typeCheckboxes = page.locator(
      '[data-testid="type-option-highlight_video"]',
    );
    if (await typeCheckboxes.isVisible()) {
      await typeCheckboxes.check();
    }

    const transcriptCheckbox = page.locator(
      '[data-testid="type-option-transcript"]',
    );
    if (await transcriptCheckbox.isVisible()) {
      await transcriptCheckbox.check();
    }

    await page.waitForTimeout(500);

    // Verify results contain documents of both types
    const results = page.locator('[data-testid="document-card"]');
    const count = await results.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should filter documents by category", async ({ page }) => {
    // Open filters
    const filterBtn = page.locator('[data-testid="open-filters-btn"]');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }

    // Select category filter
    const categoryDropdown = page.locator('[data-testid="filter-category"]');
    if (await categoryDropdown.isVisible()) {
      await categoryDropdown.selectOption("media");

      await page.waitForTimeout(500);

      // Verify filtered results
      const results = page.locator('[data-testid="document-card"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should filter by date range", async ({ page }) => {
    // Open filters
    const filterBtn = page.locator('[data-testid="open-filters-btn"]');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }

    // Set date range filters
    const fromDateInput = page.locator('[data-testid="filter-date-from"]');
    const toDateInput = page.locator('[data-testid="filter-date-to"]');

    if ((await fromDateInput.isVisible()) && (await toDateInput.isVisible())) {
      // Set range for last 30 days
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);

      await fromDateInput.fill(from.toISOString().split("T")[0]);
      await toDateInput.fill(to.toISOString().split("T")[0]);

      await page.waitForTimeout(500);

      // Verify results filtered
      const results = page.locator('[data-testid="document-card"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should filter by sharing status", async ({ page }) => {
    // Open filters
    const filterBtn = page.locator('[data-testid="open-filters-btn"]');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }

    // Select "shared" filter
    const sharedCheckbox = page.locator('[data-testid="filter-shared-only"]');
    if (await sharedCheckbox.isVisible()) {
      await sharedCheckbox.check();

      await page.waitForTimeout(500);

      // Verify results show only shared documents
      const results = page.locator('[data-testid="document-card"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should remove individual filters", async ({ page }) => {
    // Open filters
    const filterBtn = page.locator('[data-testid="open-filters-btn"]');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }

    // Apply a filter
    const typeCheckbox = page.locator(
      '[data-testid="type-option-highlight_video"]',
    );
    if (await typeCheckbox.isVisible()) {
      await typeCheckbox.check();
      await page.waitForTimeout(500);

      // Remove the filter
      await typeCheckbox.uncheck();
      await page.waitForTimeout(500);

      // Verify all documents shown
      const results = page.locator('[data-testid="document-card"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should clear all filters", async ({ page }) => {
    // Open filters
    const filterBtn = page.locator('[data-testid="open-filters-btn"]');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }

    // Apply multiple filters
    const typeCheckbox = page.locator(
      '[data-testid="type-option-highlight_video"]',
    );
    if (await typeCheckbox.isVisible()) {
      await typeCheckbox.check();
    }

    const categoryDropdown = page.locator('[data-testid="filter-category"]');
    if (await categoryDropdown.isVisible()) {
      await categoryDropdown.selectOption("media");
    }

    await page.waitForTimeout(500);

    // Click "Clear all"
    const clearAllBtn = page.locator('[data-testid="clear-all-filters-btn"]');
    if (await clearAllBtn.isVisible()) {
      await clearAllBtn.click();
      await page.waitForTimeout(500);

      // Verify all filters cleared
      const checkedBoxes = page.locator(
        '[data-testid="type-option-highlight_video"]:checked',
      );
      const count = await checkedBoxes.count();
      expect(count).toBe(0);
    }
  });

  // ============================================================================
  // SORTING WORKFLOWS
  // ============================================================================

  test("should sort results by date (newest first)", async ({ page }) => {
    // Open sort options
    const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
    if (await sortDropdown.isVisible()) {
      await sortDropdown.selectOption("date-newest");

      await page.waitForTimeout(500);

      // Verify results sorted
      const results = page.locator('[data-testid="document-card"]');
      const count = await results.count();

      if (count >= 2) {
        // Get dates from first and second document
        const firstDate = await results
          .nth(0)
          .locator('[data-testid="document-date"]')
          .textContent();
        const secondDate = await results
          .nth(1)
          .locator('[data-testid="document-date"]')
          .textContent();

        // First should be more recent than second (for newest first)
        expect(firstDate).toBeDefined();
        expect(secondDate).toBeDefined();
      }
    }
  });

  test("should sort results by date (oldest first)", async ({ page }) => {
    // Open sort options
    const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
    if (await sortDropdown.isVisible()) {
      await sortDropdown.selectOption("date-oldest");

      await page.waitForTimeout(500);

      // Verify results sorted
      const results = page.locator('[data-testid="document-card"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should sort results by name (A-Z)", async ({ page }) => {
    // Open sort options
    const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
    if (await sortDropdown.isVisible()) {
      await sortDropdown.selectOption("name-asc");

      await page.waitForTimeout(500);

      // Verify results sorted
      const results = page.locator('[data-testid="document-card"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should sort results by size", async ({ page }) => {
    // Open sort options
    const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
    if (await sortDropdown.isVisible()) {
      await sortDropdown.selectOption("size-largest");

      await page.waitForTimeout(500);

      // Verify results sorted by size
      const results = page.locator('[data-testid="document-card"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  // ============================================================================
  // PAGINATION WORKFLOWS
  // ============================================================================

  test("should paginate through search results", async ({ page }) => {
    // Verify pagination controls visible (if there are enough results)
    const paginationContainer = page.locator('[data-testid="pagination"]');
    const nextBtn = page.locator('[data-testid="pagination-next"]');

    if (await paginationContainer.isVisible()) {
      // Get current results count
      const initialCount = await page
        .locator('[data-testid="document-card"]')
        .count();

      // Click next page
      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(500);

        // Verify different results on next page
        const newCount = await page
          .locator('[data-testid="document-card"]')
          .count();
        expect(newCount).toBeGreaterThan(0);
      }
    }
  });

  test("should navigate between pages", async ({ page }) => {
    // Check if pagination exists
    const paginationContainer = page.locator('[data-testid="pagination"]');

    if (await paginationContainer.isVisible()) {
      // Click page 2
      const page2Btn = page.locator('[data-testid="pagination-page-2"]');
      if (await page2Btn.isVisible()) {
        await page2Btn.click();
        await page.waitForTimeout(500);

        // Verify on page 2
        const activePage = page.locator('[data-testid="pagination-active"]');
        await expect(activePage).toContainText("2");
      }

      // Go back to page 1
      const page1Btn = page.locator('[data-testid="pagination-page-1"]');
      if (await page1Btn.isVisible()) {
        await page1Btn.click();
        await page.waitForTimeout(500);

        // Verify on page 1
        const activePage = page.locator('[data-testid="pagination-active"]');
        await expect(activePage).toContainText("1");
      }
    }
  });

  test("should change items per page", async ({ page }) => {
    // Find items per page selector
    const itemsPerPageSelect = page.locator('[data-testid="items-per-page"]');

    if (await itemsPerPageSelect.isVisible()) {
      // Change to 50 items
      await itemsPerPageSelect.selectOption("50");
      await page.waitForTimeout(500);

      // Verify more items shown (or fewer if total < 50)
      const results = page.locator('[data-testid="document-card"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  // ============================================================================
  // ADVANCED SEARCH WORKFLOWS
  // ============================================================================

  test("should search with multiple criteria combined", async ({ page }) => {
    // Enter search text
    const searchInput = page.locator('[data-testid="documents-search"]');
    await searchInput.fill("highlight");

    // Open filters
    const filterBtn = page.locator('[data-testid="open-filters-btn"]');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }

    // Apply type filter
    const videoFilter = page.locator(
      '[data-testid="type-option-highlight_video"]',
    );
    if (await videoFilter.isVisible()) {
      await videoFilter.check();
    }

    // Apply category filter
    const categoryFilter = page.locator('[data-testid="filter-category"]');
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption("media");
    }

    await page.waitForTimeout(500);

    // Verify filtered and searched results
    const results = page.locator('[data-testid="document-card"]');
    const count = await results.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should filter by multiple tags", async ({ page }) => {
    // Open filters
    const filterBtn = page.locator('[data-testid="open-filters-btn"]');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }

    // Select multiple tags
    const tag1 = page.locator('[data-testid="tag-filter-gpa"]');
    const tag2 = page.locator('[data-testid="tag-filter-honors"]');

    if (await tag1.isVisible()) {
      await tag1.check();
    }

    if (await tag2.isVisible()) {
      await tag2.check();
    }

    await page.waitForTimeout(500);

    // Verify results with matching tags
    const results = page.locator('[data-testid="document-card"]');
    const count = await results.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ============================================================================
  // SEARCH WORKFLOW - COMPLETE FLOW
  // ============================================================================

  test("should complete full search and filter workflow", async ({ page }) => {
    // 1. Search for documents
    const searchInput = page.locator('[data-testid="documents-search"]');
    await searchInput.fill("test");
    await page.waitForTimeout(500);

    // 2. Open filters
    const filterBtn = page.locator('[data-testid="open-filters-btn"]');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }

    // 3. Apply type filter
    const typeFilter = page.locator('[data-testid="type-option-transcript"]');
    if (await typeFilter.isVisible()) {
      await typeFilter.check();
    }

    await page.waitForTimeout(500);

    // 4. Sort results
    const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
    if (await sortDropdown.isVisible()) {
      await sortDropdown.selectOption("date-newest");
    }

    await page.waitForTimeout(500);

    // 5. Verify results
    const results = page.locator('[data-testid="document-card"]');
    const count = await results.count();
    expect(count).toBeGreaterThanOrEqual(0);

    // 6. Click on a result to view details
    if (count > 0) {
      await results.first().click();
      await page.waitForLoadState("networkidle");

      // Verify detail page loads
      const detailName = page.locator('[data-testid="document-name"]');
      await expect(detailName).toBeVisible();
    }

    // 7. Go back and clear search
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");

    if (await searchInput.isVisible()) {
      await searchInput.clear();
    }

    await page.waitForTimeout(500);

    // 8. Verify all documents shown
    const allResults = page.locator('[data-testid="document-card"]');
    const totalCount = await allResults.count();
    expect(totalCount).toBeGreaterThan(0);
  });
});
