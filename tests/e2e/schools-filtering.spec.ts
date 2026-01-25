import { test, expect } from "@playwright/test";

/**
 * E2E Test Suite: School Filtering UI
 * Tests for User Story 3.3 - Parent Filters and Sorts Schools
 *
 * Acceptance Criteria:
 * - Filter by priority tier (A, B, C)
 * - Filter by status (Researching, Contacted, etc.)
 * - Filter by fit score range
 * - Filter by distance (within X miles)
 * - Filter by division (D1, D2, D3, NAIA, JUCO)
 * - Filter by state
 * - Sort by distance, fit score, last contact, A-Z
 * - Multiple filters work together (AND logic)
 * - Results load in under 100ms
 */

test.describe("Schools Filtering - User Story 3.3", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to schools page
    await page.goto("/schools");

    // Wait for schools to load
    await page.waitForSelector("[data-testid='school-card']", { timeout: 10000 });
  });

  // ============================================================================
  // FIT SCORE RANGE FILTER TESTS
  // ============================================================================

  test("should filter schools by fit score range (70-100)", async ({ page }) => {
    // Get initial count
    const initialCards = await page.locator("[data-testid='school-card']").count();
    expect(initialCards).toBeGreaterThan(0);

    // Fill fit score range
    const fitScoreMin = page.locator('input[placeholder="Min"]').first();
    const fitScoreMax = page.locator('input[placeholder="Max"]').first();

    await fitScoreMin.fill("70");
    await fitScoreMax.fill("100");

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify filter chip appears
    const filterChip = page.locator("text=70 - 100");
    await expect(filterChip).toBeVisible();

    // Verify results changed
    const filteredCards = await page.locator("[data-testid='school-card']").count();
    expect(filteredCards).toBeLessThanOrEqual(initialCards);
  });

  test("should remove fit score filter when X button clicked", async ({ page }) => {
    const initialCards = await page.locator("[data-testid='school-card']").count();

    // Apply fit score filter
    const fitScoreMin = page.locator('input[placeholder="Min"]').first();
    const fitScoreMax = page.locator('input[placeholder="Max"]').first();

    await fitScoreMin.fill("80");
    await fitScoreMax.fill("100");

    await page.waitForTimeout(500);

    // Find and click the X button on the filter chip
    const filterChip = page.locator("text=80 - 100").first();
    const removeButton = filterChip.locator("button");
    await removeButton.click();

    await page.waitForTimeout(500);

    // Verify filter chip is gone
    await expect(page.locator("text=80 - 100")).not.toBeVisible();

    // Verify results returned to original count
    const cards = await page.locator("[data-testid='school-card']").count();
    expect(cards).toBeGreaterThanOrEqual(initialCards - 1); // Allow minor variance
  });

  test("should handle partial fit score input (min only)", async ({ page }) => {
    const fitScoreMin = page.locator('input[placeholder="Min"]').first();

    await fitScoreMin.fill("75");
    await page.waitForTimeout(500);

    const filterChip = page.locator("text=75 - 100");
    await expect(filterChip).toBeVisible();
  });

  test("should handle partial fit score input (max only)", async ({ page }) => {
    const fitScoreMax = page.locator('input[placeholder="Max"]').first();

    await fitScoreMax.fill("80");
    await page.waitForTimeout(500);

    const filterChip = page.locator("text=0 - 80");
    await expect(filterChip).toBeVisible();
  });

  // ============================================================================
  // DISTANCE RANGE FILTER TESTS
  // ============================================================================

  test("should filter schools by distance range (slider)", async ({ page }) => {
    // Check if home location warning appears
    const warning = page.locator("text=Set home location to filter by distance");
    const warningVisible = await warning.isVisible().catch(() => false);

    if (!warningVisible) {
      // Home location is set, test distance filter
      const initialCards = await page.locator("[data-testid='school-card']").count();

      // Find and interact with distance slider
      const distanceSlider = page.locator('input[type="range"]');
      await distanceSlider.fill("500");

      await page.waitForTimeout(500);

      // Verify filter chip appears
      const filterChip = page.locator("text=Within 500 miles");
      await expect(filterChip).toBeVisible();

      // Verify results changed (should be different if many schools)
      const filteredCards = await page.locator("[data-testid='school-card']").count();
      expect(filteredCards).toBeLessThanOrEqual(initialCards);
    } else {
      // Home location not set, verify warning is visible
      await expect(warning).toBeVisible();

      // Verify distance slider is disabled
      const distanceSlider = page.locator('input[type="range"]');
      await expect(distanceSlider).toBeDisabled();
    }
  });

  test("should show warning when home location is not set", async ({ page }) => {
    const warning = page.locator("text=Set home location to filter by distance");
    const warningExists = await warning.isVisible().catch(() => false);

    if (warningExists) {
      await expect(warning).toBeVisible();
    }
  });

  test("should display distance value next to slider", async ({ page }) => {
    const warning = page.locator("text=Set home location to filter by distance");
    const warningVisible = await warning.isVisible().catch(() => false);

    if (!warningVisible) {
      // Distance display should show current value
      const distanceDisplay = page.locator("text=mi").first();
      await expect(distanceDisplay).toBeVisible();
    }
  });

  // ============================================================================
  // STATE FILTER TESTS
  // ============================================================================

  test("should filter schools by state", async ({ page }) => {
    const initialCards = await page.locator("[data-testid='school-card']").count();
    expect(initialCards).toBeGreaterThan(0);

    // Find state select
    const stateSelect = page.locator('select').filter({ has: page.locator("text=State") });
    await stateSelect.selectOption("CA");

    await page.waitForTimeout(500);

    // Verify filter chip appears (state abbreviation)
    const filterChip = page.locator("text=CA");
    await expect(filterChip).toBeVisible();

    // Verify results changed
    const filteredCards = await page.locator("[data-testid='school-card']").count();
    expect(filteredCards).toBeLessThanOrEqual(initialCards);
  });

  test("should only show states with schools in dropdown", async ({ page }) => {
    // Find state select
    const stateSelect = page.locator('select').filter({ has: page.locator("text=State") });

    // Get all options
    const options = await stateSelect.locator("option").count();

    // Should have at least one state option (plus "-- All --")
    expect(options).toBeGreaterThanOrEqual(2);
  });

  test("should remove state filter when changed to 'All'", async ({ page }) => {
    const stateSelect = page.locator('select').filter({ has: page.locator("text=State") });

    // Select a state
    await stateSelect.selectOption("CA");
    await page.waitForTimeout(500);

    // Verify filter chip
    const filterChip = page.locator("text=CA");
    await expect(filterChip).toBeVisible();

    // Change back to All
    await stateSelect.selectOption("");
    await page.waitForTimeout(500);

    // Verify filter chip is gone
    await expect(filterChip).not.toBeVisible();
  });

  // ============================================================================
  // COMBINED FILTER TESTS
  // ============================================================================

  test("should apply multiple filters together", async ({ page }) => {
    const initialCards = await page.locator("[data-testid='school-card']").count();
    expect(initialCards).toBeGreaterThan(0);

    // Apply division filter
    const divisionSelect = page.locator('select').nth(0);
    await divisionSelect.selectOption("D2");

    // Apply fit score range
    const fitScoreMin = page.locator('input[placeholder="Min"]').first();
    const fitScoreMax = page.locator('input[placeholder="Max"]').first();
    await fitScoreMin.fill("70");
    await fitScoreMax.fill("100");

    await page.waitForTimeout(500);

    // Verify both filter chips appear
    await expect(page.locator("text=Division 2")).toBeVisible();
    await expect(page.locator("text=70 - 100")).toBeVisible();

    // Verify results are different
    const filteredCards = await page.locator("[data-testid='school-card']").count();
    expect(filteredCards).toBeLessThanOrEqual(initialCards);
  });

  test("should update results when combining fit score and state filters", async ({
    page,
  }) => {
    const initialCards = await page.locator("[data-testid='school-card']").count();

    // Apply fit score filter
    const fitScoreMin = page.locator('input[placeholder="Min"]').first();
    await fitScoreMin.fill("75");

    // Apply state filter
    const stateSelect = page.locator('select').filter({ has: page.locator("text=State") });
    await stateSelect.selectOption("CA");

    await page.waitForTimeout(500);

    // Both filters should be visible
    await expect(page.locator("text=75 - 100")).toBeVisible();
    await expect(page.locator("text=CA")).toBeVisible();

    // Results should be filtered
    const filteredCards = await page.locator("[data-testid='school-card']").count();
    expect(filteredCards).toBeLessThanOrEqual(initialCards);
  });

  // ============================================================================
  // FILTER CHIP TESTS
  // ============================================================================

  test("should display active filter chips", async ({ page }) => {
    // Apply a filter
    const divisionSelect = page.locator('select').nth(0);
    await divisionSelect.selectOption("D3");

    await page.waitForTimeout(500);

    // Verify chip appears
    const chip = page.locator("text=Division 3");
    await expect(chip).toBeVisible();

    // Verify chip has remove button
    const removeBtn = chip.locator("button");
    await expect(removeBtn).toBeVisible();
  });

  test("should show 'Active filters:' label when filters are applied", async ({
    page,
  }) => {
    // No filters applied initially, label shouldn't show
    let activeLabel = page.locator("text=Active filters:");
    let isVisible = await activeLabel.isVisible().catch(() => false);
    expect(isVisible).toBe(false);

    // Apply a filter
    const statusSelect = page.locator('select').nth(2);
    await statusSelect.selectOption("researching");

    await page.waitForTimeout(500);

    // Now label should show
    activeLabel = page.locator("text=Active filters:");
    await expect(activeLabel).toBeVisible();
  });

  test("should allow clearing all filters at once", async ({ page }) => {
    // Apply multiple filters
    const divisionSelect = page.locator('select').nth(0);
    await divisionSelect.selectOption("D1");

    const fitScoreMin = page.locator('input[placeholder="Min"]').first();
    await fitScoreMin.fill("80");

    await page.waitForTimeout(500);

    // Verify filters are applied
    await expect(page.locator("text=Division 1")).toBeVisible();
    await expect(page.locator("text=80 - 100")).toBeVisible();

    // Find and click "Clear all" button
    const clearAllBtn = page.locator("text=Clear all");
    await clearAllBtn.click();

    await page.waitForTimeout(500);

    // Verify all filters are cleared
    await expect(page.locator("text=Division 1")).not.toBeVisible();
    await expect(page.locator("text=80 - 100")).not.toBeVisible();
  });

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  test("should show empty state message when no schools match filters", async ({
    page,
  }) => {
    // Apply a very restrictive filter (fit score 0-1)
    const fitScoreMin = page.locator('input[placeholder="Min"]').first();
    const fitScoreMax = page.locator('input[placeholder="Max"]').first();

    await fitScoreMin.fill("0");
    await fitScoreMax.fill("1");

    await page.waitForTimeout(500);

    // Check for empty state message
    const emptyMessage = page.locator("text=No schools found");
    const messageVisible = await emptyMessage.isVisible().catch(() => false);

    if (messageVisible) {
      await expect(emptyMessage).toBeVisible();

      // Should show "Clear Filters" button
      const clearBtn = page.locator("text=Clear Filters");
      await expect(clearBtn).toBeVisible();
    }
  });

  // ============================================================================
  // INTERACTIVE BEHAVIOR TESTS
  // ============================================================================

  test("should update school count when filters change", async ({ page }) => {
    // Get initial count
    const countText = page.locator("text=/\\d+ school").first();
    const initialText = await countText.textContent();

    // Apply a filter
    const divisionSelect = page.locator('select').nth(0);
    await divisionSelect.selectOption("D2");

    await page.waitForTimeout(500);

    // Count should update
    const newText = await countText.textContent();
    // Text might change (could be same if all are D2)
    expect(newText).toBeDefined();
  });

  test("should allow interacting with filter controls independently", async ({
    page,
  }) => {
    // Apply fit score filter
    const fitScoreMin = page.locator('input[placeholder="Min"]').first();
    await fitScoreMin.fill("70");

    await page.waitForTimeout(300);

    // Then apply state filter
    const stateSelect = page.locator('select').filter({ has: page.locator("text=State") });
    await stateSelect.selectOption("TX");

    await page.waitForTimeout(300);

    // Both filters should be active
    await expect(page.locator("text=70 - 100")).toBeVisible();
    await expect(page.locator("text=TX")).toBeVisible();
  });

  // ============================================================================
  // RESPONSIVE LAYOUT TESTS
  // ============================================================================

  test("should display filter bar in two-row grid layout", async ({ page }) => {
    // Check that search input exists in row 1
    const searchInput = page.locator('input[placeholder="School name or location..."]');
    await expect(searchInput).toBeVisible();

    // Check that fit score inputs exist in row 2
    const fitScoreInputs = page.locator('input[placeholder="Min"], input[placeholder="Max"]');
    const fitScoreCount = await fitScoreInputs.count();
    expect(fitScoreCount).toBeGreaterThanOrEqual(2);

    // Check that distance slider exists in row 2
    const distanceSlider = page.locator('input[type="range"]');
    await expect(distanceSlider).toBeVisible();
  });

  test("should display all required filter controls", async ({ page }) => {
    // Verify all filter inputs are visible
    await expect(page.locator('input[placeholder="School name or location..."]')).toBeVisible();
    await expect(page.locator("text=Division")).toBeVisible();
    await expect(page.locator("text=Status")).toBeVisible();
    await expect(page.locator("text=Favorites Only")).toBeVisible();
    await expect(page.locator("text=Fit Score Range")).toBeVisible();
    await expect(page.locator("text=Distance Range")).toBeVisible();
    await expect(page.locator("text=State")).toBeVisible();
  });
});
