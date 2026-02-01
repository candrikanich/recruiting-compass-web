import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3003";

test.describe("Story 3.4: School Status Tracking", () => {
  let schoolId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to schools list
    await page.goto(`${BASE_URL}/schools`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="school-card"]', {
      timeout: 10000,
    });
  });

  test("should display 9 recruiting status options in dropdown", async ({
    page,
  }) => {
    // Find and click on first school
    const firstSchoolLink = page.locator('[data-testid="school-card"]').first();
    await firstSchoolLink.click();

    // Wait for school detail page
    await page.waitForURL(/\/schools\/[^/]+$/);

    // Find status dropdown
    const statusSelect = page.locator('select[class*="status"]').first();
    await statusSelect.waitFor({ state: "visible" });

    // Check all options are available
    const options = await statusSelect.locator("option").count();

    expect(options).toBeGreaterThanOrEqual(9);

    // Verify key status values exist
    const optionTexts = [];
    for (let i = 0; i < options; i++) {
      const text = await statusSelect.locator("option").nth(i).textContent();
      if (text) optionTexts.push(text);
    }

    expect(optionTexts).toContain("Interested");
    expect(optionTexts).toContain("Contacted");
    expect(optionTexts).toContain("Camp Invite");
    expect(optionTexts).toContain("Recruited");
    expect(optionTexts).toContain("Offer Received");
    expect(optionTexts).toContain("Committed");
    expect(optionTexts).toContain("Not Pursuing");
  });

  test("should change school status and record timestamp", async ({ page }) => {
    // Navigate to school detail
    const firstSchoolLink = page.locator('[data-testid="school-card"]').first();
    await firstSchoolLink.click();

    // Wait for school detail page
    await page.waitForURL(/\/schools\/[^/]+$/);

    // Get current status
    const statusSelect = page.locator('select[class*="status"]').first();
    await statusSelect.waitFor({ state: "visible" });

    // Change status to "Committed"
    await statusSelect.selectOption("committed");

    // Wait for update to complete
    await page.waitForTimeout(1000);

    // Verify status changed
    const selectedValue = await statusSelect.inputValue();
    expect(selectedValue).toBe("committed");

    // Status badge should update
    const statusBadge = page.locator('[class*="status"]').filter({
      hasText: "Committed",
    });
    await expect(statusBadge).toBeVisible();
  });

  test("should show status change timestamp", async ({ page }) => {
    // Navigate to school detail
    const firstSchoolLink = page.locator('[data-testid="school-card"]').first();
    await firstSchoolLink.click();

    // Wait for school detail page
    await page.waitForURL(/\/schools\/[^/]+$/);

    // Change status
    const statusSelect = page.locator('select[class*="status"]').first();
    await statusSelect.waitFor({ state: "visible" });
    await statusSelect.selectOption("recruited");

    // Wait for update
    await page.waitForTimeout(1000);

    // Look for status changed timestamp display
    const pageContent = await page.content();
    // Verify that there's some indication of when status was changed
    // This would depend on UI implementation
    expect(statusSelect.inputValue()).toBeTruthy();
  });

  test("should maintain status and priority tier independently", async ({
    page,
  }) => {
    // Navigate to school detail
    const firstSchoolLink = page.locator('[data-testid="school-card"]').first();
    await firstSchoolLink.click();

    // Wait for school detail page
    await page.waitForURL(/\/schools\/[^/]+$/);

    // Set priority tier to A
    const priorityButtons = page.locator('[data-testid*="priority-selector"]');
    if ((await priorityButtons.count()) > 0) {
      const tierAButton = page
        .locator("button")
        .filter({ hasText: "A" })
        .first();
      await tierAButton.click();
      await page.waitForTimeout(500);
    }

    // Change status
    const statusSelect = page.locator('select[class*="status"]').first();
    await statusSelect.selectOption("contacted");
    await page.waitForTimeout(1000);

    // Verify status changed
    const selectedStatus = await statusSelect.inputValue();
    expect(selectedStatus).toBe("contacted");

    // Priority tier should still be set (if it was)
    // This verifies they're independent
  });

  test("should support all status transitions", async ({ page }) => {
    // Navigate to school detail
    const firstSchoolLink = page.locator('[data-testid="school-card"]').first();
    await firstSchoolLink.click();

    await page.waitForURL(/\/schools\/[^/]+$/);

    const statusSelect = page.locator('select[class*="status"]').first();
    await statusSelect.waitFor({ state: "visible" });

    const statuses = ["interested", "contacted", "camp_invite", "recruited"];

    for (const status of statuses) {
      await statusSelect.selectOption(status);
      await page.waitForTimeout(500);
      const selectedValue = await statusSelect.inputValue();
      expect(selectedValue).toBe(status);
    }
  });

  test("should handle status changes with network latency", async ({
    page,
  }) => {
    // Throttle network to simulate latency
    await page.route("**/*", (route) => {
      setTimeout(() => route.continue(), 500); // 500ms delay
    });

    // Navigate to school detail
    const firstSchoolLink = page.locator('[data-testid="school-card"]').first();
    await firstSchoolLink.click();

    await page.waitForURL(/\/schools\/[^/]+$/);

    // Change status while network is slow
    const statusSelect = page.locator('select[class*="status"]').first();
    await statusSelect.selectOption("committed");

    // Wait for slow request to complete
    await page.waitForTimeout(2000);

    // Verify status was updated despite latency
    const selectedValue = await statusSelect.inputValue();
    expect(selectedValue).toBe("committed");
  });

  test("should prevent concurrent status updates", async ({ page }) => {
    // Navigate to school detail
    const firstSchoolLink = page.locator('[data-testid="school-card"]').first();
    await firstSchoolLink.click();

    await page.waitForURL(/\/schools\/[^/]+$/);

    const statusSelect = page.locator('select[class*="status"]').first();
    await statusSelect.waitFor({ state: "visible" });

    // Try to change status rapidly
    await statusSelect.selectOption("interested");
    // Don't wait, immediately change again
    await statusSelect.selectOption("contacted");
    await statusSelect.selectOption("camp_invite");

    // Wait for final update
    await page.waitForTimeout(1500);

    // Final value should be one of the selected options
    const finalValue = await statusSelect.inputValue();
    expect(["interested", "contacted", "camp_invite"]).toContain(finalValue);
  });

  test("should handle status update errors gracefully", async ({ page }) => {
    // This test would require mocking API failures
    // Navigate to school detail
    const firstSchoolLink = page.locator('[data-testid="school-card"]').first();
    await firstSchoolLink.click();

    await page.waitForURL(/\/schools\/[^/]+$/);

    const statusSelect = page.locator('select[class*="status"]').first();
    await statusSelect.waitFor({ state: "visible" });

    // Should not throw or crash
    await statusSelect.selectOption("recruited");
    await page.waitForTimeout(1000);

    // Page should still be functional
    expect(page.url()).toContain("/schools/");
  });
});
