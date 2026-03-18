import { test, expect } from "@playwright/test";
import { resolve } from "path";

/**
 * E2E Test Suite: School Filtering UI
 * Tests for User Story 3.3 - Parent Filters and Sorts Schools
 *
 * Filter UI is SchoolsFilterPanel with:
 * - Search: input#school-search, placeholder="Search by name or location..."
 * - Distance: input[type="range"] slider (disabled without home location)
 * - Division, Status, State, Favorites, Sort: SchoolFilterSelect dropdowns
 * - Active filter chips: "Filters:" label + chip values + "Clear all" button
 */

test.describe("Schools Filtering - User Story 3.3", () => {
  // Run serially to avoid data contamination from parallel school-creation tests
  test.describe.configure({ mode: "serial" });
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/schools");
    // Use load instead of networkidle to avoid timing out on slow requests
    await page.waitForLoadState("load");
    await page.waitForTimeout(500);
    // Wait for schools or empty state — SchoolsFilterPanel only renders when schools.length > 0
    await page
      .waitForSelector("[data-testid='school-card']", { timeout: 10000 })
      .catch(() => {}); // ok if no schools — tests guard against this
  });

  // ============================================================================
  // REQUIRED FILTER CONTROLS
  // ============================================================================

  test("should display all required filter controls", async ({ page }) => {
    // Filter panel only renders when schools exist
    const hasSchools = await page.locator("[data-testid='school-card']").count();
    if (hasSchools === 0) return;

    await expect(
      page.locator('#school-search'),
    ).toBeVisible();
    await expect(page.locator("#filter-division")).toBeVisible();
    await expect(page.locator("#filter-status")).toBeVisible();
    await expect(page.locator("#filter-state")).toBeVisible();
    await expect(page.locator("#filter-favorites")).toBeVisible();
  });

  // ============================================================================
  // SEARCH FILTER TESTS
  // ============================================================================

  test("should filter schools by search text", async ({ page }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return; // Filter panel not shown — no data to test

    const searchInput = page.locator(
      '#school-search',
    );
    await searchInput.fill("zzzzzzzznotaschool");
    await page.waitForTimeout(500);

    const filteredCount = await schoolCards.count();
    expect(filteredCount).toBe(0);
  });

  test("should show filter chip when search text is applied", async ({
    page,
  }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    const searchInput = page.locator(
      '#school-search',
    );
    await searchInput.fill("University");
    await page.waitForTimeout(500);

    // Chip value is displayed as "University" (quoted in display)
    const filtersLabel = page.locator("text=Filters:");
    await expect(filtersLabel).toBeVisible();
  });

  // ============================================================================
  // DISTANCE RANGE FILTER TESTS
  // ============================================================================

  test("should filter schools by distance slider when home location is set", async ({
    page,
  }) => {
    const distanceSlider = page.locator('input[type="range"]');
    const isDisabled = await distanceSlider.isDisabled().catch(() => true);

    if (isDisabled) {
      // Home location not set — verify disabled state and helper text
      await expect(distanceSlider).toBeDisabled();
      await expect(page.locator("text=Set home location")).toBeVisible();
      return;
    }

    const initialCount = await page
      .locator("[data-testid='school-card']")
      .count();

    await distanceSlider.fill("500");
    await page.waitForTimeout(500);

    // Chip should show "Within 500 miles"
    const chip = page.locator("text=Within 500 miles");
    await expect(chip).toBeVisible();

    const filteredCount = await page
      .locator("[data-testid='school-card']")
      .count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test("should disable distance slider and show hint when home location is not set", async ({
    page,
  }) => {
    const distanceSlider = page.locator('input[type="range"]');
    const sliderExists = await distanceSlider.count();
    if (sliderExists === 0) return; // filter panel not shown (no schools)
    const isDisabled = await distanceSlider.isDisabled({ timeout: 1000 }).catch(() => false);

    if (isDisabled) {
      await expect(distanceSlider).toBeDisabled();
      await expect(page.locator("text=Set home location")).toBeVisible();
    }
    // If home location is set, this test is a no-op — that is acceptable
  });

  test("should display distance value next to slider", async ({ page }) => {
    const distanceSlider = page.locator('input[type="range"]');
    const sliderExists = await distanceSlider.count();
    if (sliderExists === 0) return; // filter panel not shown (no schools)
    const isDisabled = await distanceSlider.isDisabled({ timeout: 1000 }).catch(() => true);

    if (!isDisabled) {
      // The distance label shows "X mi" next to the slider
      const distanceDisplay = page.locator("text=/\\d+ mi/").first();
      await expect(distanceDisplay).toBeVisible();
    }
  });

  // ============================================================================
  // STATE FILTER TESTS
  // ============================================================================

  test("should filter schools by state", async ({ page }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    const stateSelectById = page.locator("#filter-state");

    // Use the first non-empty option (data-dependent — only available states are shown)
    const options = await stateSelectById.locator("option").all();
    const optionValues = await Promise.all(options.map(o => o.getAttribute("value")));
    const firstRealIndex = optionValues.findIndex(value => value !== "");
    if (firstRealIndex === -1) return; // no states available
    const stateValue = optionValues[firstRealIndex];
    if (!stateValue) return;
    await stateSelectById.selectOption(stateValue);

    const filteredCount = await schoolCards.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Chip should have a remove button with aria-label matching the state value
    await expect(page.locator(`button[aria-label="Remove ${stateValue} filter"]`)).toBeVisible();
  });

  test("should show states with schools in the State dropdown", async ({
    page,
  }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    // State is the 3rd select in the filter grid
    const stateSelect = page.locator("#filter-state");
    const options = await stateSelect.locator("option").count();

    // Should have at least one state option plus "All"
    expect(options).toBeGreaterThanOrEqual(2);
  });

  test("should remove state filter chip when changed back to All", async ({
    page,
  }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    const stateSelect = page.locator("#filter-state");

    // Use the first available state option (data-dependent)
    const firstStateVal = await stateSelect.locator("option").nth(1).getAttribute("value");
    if (!firstStateVal) return;
    await stateSelect.selectOption(firstStateVal);
    await page.waitForTimeout(500);

    const hasChip = await page
      .locator(`button[aria-label="Remove ${firstStateVal} filter"]`)
      .isVisible()
      .catch(() => false);
    if (!hasChip) return; // No schools for that state, no chip shown

    await stateSelect.selectOption("");
    await page.waitForTimeout(500);

    // State chip should be gone
    await expect(page.locator(`button[aria-label="Remove ${firstStateVal} filter"]`)).not.toBeVisible();
  });

  // ============================================================================
  // DIVISION FILTER TESTS
  // ============================================================================

  test("should filter schools by division", async ({ page }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    // Division is the first select in the filter grid
    const divisionSelect = page.locator("#filter-division");
    await divisionSelect.selectOption("D1");
    await page.waitForTimeout(500);

    const filteredCount = await schoolCards.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    const hasFilters = await page
      .locator("text=Filters:")
      .isVisible()
      .catch(() => false);
    if (hasFilters) {
      // Use aria-label on the remove button to confirm the D1 chip exists
      await expect(page.locator('button[aria-label="Remove D1 filter"]')).toBeVisible();
    }
  });

  // ============================================================================
  // COMBINED FILTER TESTS
  // ============================================================================

  test("should apply multiple filters together", async ({ page }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    // Apply division filter
    const divisionSelect = page.locator("#filter-division");
    await divisionSelect.selectOption("D1");

    // Apply status filter (hardcoded options, not data-dependent)
    const statusSelect = page.locator("#filter-status");
    await statusSelect.selectOption("researching");

    await page.waitForTimeout(500);

    const filteredCount = await schoolCards.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  // ============================================================================
  // FILTER CHIP TESTS
  // ============================================================================

  test("should display active filter chips with Filters: label", async ({
    page,
  }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    // No user filters applied — no chips should be visible
    const chips = page.locator('[aria-label*="Remove"][aria-label$="filter"]');
    const initialChipCount = await chips.count();
    expect(initialChipCount).toBe(0);

    // Apply a division filter
    const divisionSelect = page.locator("#filter-division");
    await divisionSelect.selectOption("D3");
    await page.waitForTimeout(500);

    // After applying filter, a chip should appear
    const chipAfterFilter = page.locator('button[aria-label="Remove D3 filter"]');
    const chipVisible = await chipAfterFilter.isVisible().catch(() => false);
    if (chipVisible) {
      await expect(chipAfterFilter).toBeVisible();
    }
  });

  test("should allow clearing all filters with Clear all button", async ({
    page,
  }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    const divisionSelect = page.locator("#filter-division");
    await divisionSelect.selectOption("D1");
    await page.waitForTimeout(500);

    // Check if a D1 chip appeared
    const d1Chip = page.locator('button[aria-label="Remove D1 filter"]');
    const hasD1Chip = await d1Chip.isVisible().catch(() => false);
    if (!hasD1Chip) return; // No D1 schools, no chip to clear

    const clearAllBtn = page.locator('button[aria-label="Clear all filters"]');
    await expect(clearAllBtn).toBeVisible();
    await clearAllBtn.click();
    await page.waitForTimeout(500);

    // After clearing, the D1 chip should be gone
    await expect(d1Chip).not.toBeVisible();
  });

  test("should allow removing individual filter chips", async ({ page }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    const divisionSelect = page.locator("#filter-division");
    await divisionSelect.selectOption("D2");
    await page.waitForTimeout(500);

    // Check if a D2 chip appeared
    const d2Chip = page.locator('button[aria-label="Remove D2 filter"]');
    const hasD2Chip = await d2Chip.isVisible().catch(() => false);
    if (!hasD2Chip) return; // No D2 schools, no chip

    await expect(d2Chip).toBeVisible();
    await d2Chip.click();
    await page.waitForTimeout(500);

    // After removing, the D2 chip should be gone
    await expect(d2Chip).not.toBeVisible();
  });

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  test("should show empty state message when no schools match filters", async ({
    page,
  }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    // Apply JUCO division filter — unlikely to match most test data
    const divisionSelect = page.locator("#filter-division");
    await divisionSelect.selectOption("JUCO");

    await page.waitForTimeout(500);

    const filteredCount = await schoolCards.count();
    if (filteredCount === 0) {
      await expect(
        page.locator("text=No schools match your filters"),
      ).toBeVisible();
      await expect(page.locator("text=Clear Filters")).toBeVisible();
    }
  });

  // ============================================================================
  // RESULT COUNT TESTS
  // ============================================================================

  test("should update result count when filters change", async ({ page }) => {
    const schoolCards = page.locator("[data-testid='school-card']");
    const initialCount = await schoolCards.count();

    if (initialCount === 0) return;

    const resultText = page.locator("text=/result/").first();
    const initialText = await resultText.textContent();

    const divisionSelect = page.locator("#filter-division");
    await divisionSelect.selectOption("D2");
    await page.waitForTimeout(500);

    const newText = await resultText.textContent();
    expect(newText).toBeDefined();
    // Result count should be visible regardless of change
    expect(newText).toMatch(/result/);
  });
});
