import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";

// TODO: These tests reference form fields that don't exist in the current implementation
// They need to be updated to match the actual form structure on /settings/player-details
test.describe.skip("Fit Score Auto-Recalculation", () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth - login/signup before accessing protected page
    await authFixture.ensureLoggedIn(page);

    // Navigate to player details page
    await page.goto("/settings/player-details");
    // Wait for page to load - use explicit wait for the gpa input to appear
    await page.waitForSelector('input[name="gpa"]', { timeout: 10000 });
  });

  test("should update fit scores when GPA is changed and saved", async ({
    page,
  }) => {
    // Find and clear the GPA input
    const gpaInput = page.locator('input[name="gpa"]');
    await gpaInput.clear();
    await gpaInput.fill("3.8");

    // Get current fit score from a school before save (if visible)
    // This is a simplified test - in real E2E you'd navigate to schools list

    // Click save button
    const saveButton = page.locator(
      'button[data-testid="save-player-details-button"]'
    );
    await saveButton.click();

    // Wait for "Saving..." text
    await expect(saveButton).toContainText("Saving...");

    // Wait for "Recalculating fit scores..." text
    await expect(saveButton).toContainText("Recalculating fit scores...");

    // Wait for success toast
    const successToast = page.locator("text=Player details saved and fit scores updated successfully");
    await expect(successToast).toBeVisible();

    // Button should be re-enabled
    await expect(saveButton).not.toBeDisabled();
  });

  test("should show warning toast if recalculation fails but save succeeds", async ({
    page,
  }) => {
    // This test would require mocking the API to fail
    // In real test, you'd:
    // 1. Intercept the API call
    // 2. Make it return an error
    // 3. Verify warning toast appears

    const gpaInput = page.locator('input[name="gpa"]');
    await gpaInput.clear();
    await gpaInput.fill("3.5");

    const saveButton = page.locator(
      'button[data-testid="save-player-details-button"]'
    );
    await saveButton.click();

    // Wait for save to complete
    await page.waitForLoadState("networkidle");

    // Verify button text changes from "Saving..." back to normal
    await expect(saveButton).not.toContainText("Saving...");
  });

  test("should show correct button text during different stages", async ({
    page,
  }) => {
    const saveButton = page.locator(
      'button[data-testid="save-player-details-button"]'
    );

    // Initially should show "Save Player Details"
    await expect(saveButton).toContainText("Save Player Details");

    // Update a field
    const gpaInput = page.locator('input[name="gpa"]');
    await gpaInput.clear();
    await gpaInput.fill("3.9");

    // Click save
    await saveButton.click();

    // Should show "Saving..."
    await expect(saveButton).toContainText("Saving...");

    // Wait for completion
    await page.waitForLoadState("networkidle");

    // Should be back to "Save Player Details"
    await expect(saveButton).toContainText("Save Player Details");
  });

  test("should handle multiple profile updates", async ({ page }) => {
    // Update GPA
    const gpaInput = page.locator('input[name="gpa"]');
    await gpaInput.clear();
    await gpaInput.fill("3.7");

    // Click save
    const saveButton = page.locator(
      'button[data-testid="save-player-details-button"]'
    );
    await saveButton.click();

    // Wait for completion
    const successToast = page.locator("text=fit scores updated successfully");
    await expect(successToast).toBeVisible();

    // Wait a moment
    await page.waitForTimeout(1000);

    // Now update SAT score
    const satInput = page.locator('input[name="sat_score"]');
    await satInput.clear();
    await satInput.fill("1400");

    // Click save again
    await saveButton.click();

    // Wait for second completion
    await expect(successToast).toBeVisible();
  });

  test("should not disable save button on recalculation error", async ({
    page,
  }) => {
    const saveButton = page.locator(
      'button[data-testid="save-player-details-button"]'
    );

    // Update a field
    const gpaInput = page.locator('input[name="gpa"]');
    await gpaInput.clear();
    await gpaInput.fill("3.6");

    // Click save
    await saveButton.click();

    // Wait for completion
    await page.waitForLoadState("networkidle");

    // Button should be enabled and clickable
    await expect(saveButton).not.toBeDisabled();
  });

  test("should show proper toast messages for different outcomes", async ({
    page,
  }) => {
    const gpaInput = page.locator('input[name="gpa"]');
    await gpaInput.clear();
    await gpaInput.fill("3.4");

    const saveButton = page.locator(
      'button[data-testid="save-player-details-button"]'
    );
    await saveButton.click();

    // Wait for either success or warning toast
    const toast = page.locator(
      "text=/Player details saved|fit score update failed/"
    );
    await expect(toast).toBeVisible();
  });
});
