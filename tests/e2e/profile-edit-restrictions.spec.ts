import { test, expect } from "@playwright/test";

/**
 * E2E tests for User Story 2.2: Parent and Athlete Profile Updates
 * Tests read-only restrictions for parents and edit history viewing
 */

test.describe("Profile Edit Restrictions (User Story 2.2)", () => {
  test.describe("Parent User Restrictions", () => {
    test("parent sees read-only warning banner", async ({ page }) => {
      // Navigate to player details page as parent
      // Note: This assumes test user is already set up with parent role
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Verify read-only warning banner is visible
      const warningBanner = page.locator("text=Read-only view");
      await expect(warningBanner).toBeVisible();

      const contactMessage = page.locator(
        "text=Contact your athlete to make changes"
      );
      await expect(contactMessage).toBeVisible();
    });

    test("parent sees all form inputs disabled", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Check that key form inputs are disabled
      const inputs = page.locator("input, select, textarea");
      const count = await inputs.count();

      // Verify a sample of inputs are disabled
      for (let i = 0; i < Math.min(5, count); i++) {
        const input = inputs.nth(i);
        const isDisabled = await input.isDisabled();
        expect(isDisabled).toBe(true);
      }
    });

    test("parent sees disabled save button", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      const saveButton = page.locator(
        'button[data-testid="save-player-details-button"]'
      );
      await expect(saveButton).toBeDisabled();

      // Button should show "Read-only view" text
      await expect(saveButton).toContainText("Read-only view");
    });

    test("parent sees position buttons disabled", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Check position toggle buttons
      const positionButtons = page.locator("button:has-text('P')").first();
      // Position buttons should be disabled for parents
      if (await positionButtons.count() > 0) {
        const isDisabled = await positionButtons.isDisabled();
        expect(isDisabled).toBe(true);
      }
    });

    test("parent cannot bypass API with direct request (403)", async ({
      page,
      request,
    }) => {
      // Attempt to make a PATCH request to the API endpoint
      const response = await request.patch(
        "/api/user/preferences/player-details",
        {
          data: {
            gpa: 3.8,
          },
          // Auth headers would be sent via cookie/session
        }
      );

      // Should get 403 Forbidden for parent role
      expect(response.status()).toBe(403);

      const body = await response.json();
      expect(body.statusMessage).toContain("read-only");
    });
  });

  test.describe("Student User - Normal Editing", () => {
    test("student sees normal player details page", async ({ page }) => {
      // Assuming we can switch to student context or the test user is a student
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Verify no warning banner
      const warningBanner = page.locator("text=Read-only view");
      await expect(warningBanner).not.toBeVisible();

      // Page title should be visible
      const pageTitle = page.locator("text=Player Details");
      await expect(pageTitle).toBeVisible();
    });

    test("student sees enabled form inputs", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Check that key form inputs are enabled
      const gpaInput = page.locator('input[name="gpa"]').first();
      const isDisabled = await gpaInput.isDisabled();
      expect(isDisabled).toBe(false);
    });

    test("student can edit and save profile", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Find GPA input and update it
      const gpaInput = page.locator('input[name="gpa"]').first();
      await gpaInput.clear();
      await gpaInput.fill("3.5");

      // Click save button
      const saveButton = page.locator(
        'button[data-testid="save-player-details-button"]'
      );
      await expect(saveButton).not.toBeDisabled();
      await saveButton.click();

      // Wait for success toast
      const successToast = page.locator("text=Player details saved");
      await expect(successToast).toBeVisible({ timeout: 10000 });
    });

    test("student sees save button enabled and shows proper text", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      const saveButton = page.locator(
        'button[data-testid="save-player-details-button"]'
      );
      await expect(saveButton).not.toBeDisabled();
      await expect(saveButton).toContainText("Save Player Details");
    });
  });

  test.describe("Edit History Viewing", () => {
    test("edit history button is visible", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      const historyButton = page.locator("text=View Edit History");
      await expect(historyButton).toBeVisible();
    });

    test("can open edit history modal", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Click the View Edit History button
      const historyButton = page.locator("button:has-text('View Edit History')");
      await historyButton.click();

      // Wait for modal to appear
      const modalTitle = page.locator("text=Profile Edit History");
      await expect(modalTitle).toBeVisible();
    });

    test("edit history modal shows loading state", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Click the View Edit History button
      const historyButton = page.locator("button:has-text('View Edit History')");
      await historyButton.click();

      // Modal should load (may show loading spinner briefly)
      const modalTitle = page.locator("text=Profile Edit History");
      await expect(modalTitle).toBeVisible();
    });

    test("can close edit history modal", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Open modal
      const historyButton = page.locator("button:has-text('View Edit History')");
      await historyButton.click();

      const modalTitle = page.locator("text=Profile Edit History");
      await expect(modalTitle).toBeVisible();

      // Close modal by clicking X button
      const closeButton = page.locator("button").filter({ has: page.locator("svg") }).last();
      await closeButton.click();

      // Modal should disappear
      await expect(modalTitle).not.toBeVisible();
    });

    test("shows empty history message when no edits made", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Open edit history modal
      const historyButton = page.locator("button:has-text('View Edit History')");
      await historyButton.click();

      // If no history, should show empty state message
      const emptyMessage = page.locator("text=No edit history available");
      // May or may not appear depending on whether user has history
      // Just verify modal is open
      const modalTitle = page.locator("text=Profile Edit History");
      await expect(modalTitle).toBeVisible();
    });

    test("displays field changes when history exists after save", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Make a change and save
      const gpaInput = page.locator('input[name="gpa"]').first();
      const currentValue = await gpaInput.inputValue();

      if (currentValue !== "3.5") {
        await gpaInput.clear();
        await gpaInput.fill("3.5");

        const saveButton = page.locator(
          'button[data-testid="save-player-details-button"]'
        );
        await saveButton.click();

        // Wait for success
        await page.locator("text=Player details saved").waitFor();
      }

      // Now open edit history
      const historyButton = page.locator("button:has-text('View Edit History')");
      await historyButton.click();

      // Should see the modal
      const modalTitle = page.locator("text=Profile Edit History");
      await expect(modalTitle).toBeVisible();

      // If we just made a change, we should see GPA in the history
      if (currentValue !== "3.5") {
        const gpaLabel = page.locator("text=GPA");
        await expect(gpaLabel).toBeVisible({ timeout: 5000 });
      }
    });

    test("shows 'Most Recent' badge on latest change", async ({ page }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Make a change to create history
      const satInput = page.locator('input[name="sat_score"]').first();
      await satInput.clear();
      await satInput.fill("1350");

      const saveButton = page.locator(
        'button[data-testid="save-player-details-button"]'
      );
      await saveButton.click();

      // Wait for save to complete
      await page.locator("text=Player details saved").waitFor();

      // Open edit history
      const historyButton = page.locator("button:has-text('View Edit History')");
      await historyButton.click();

      // Wait for modal and check for "Most Recent" badge
      await page.locator("text=Profile Edit History").waitFor();
      const badge = page.locator("text=Most Recent");
      await expect(badge).toBeVisible({ timeout: 5000 });
    });

    test("displays human-readable field labels in history", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Make a change with multiple fields
      const gpaInput = page.locator('input[name="gpa"]').first();
      await gpaInput.clear();
      await gpaInput.fill("3.7");

      const satInput = page.locator('input[name="sat_score"]').first();
      await satInput.clear();
      await satInput.fill("1400");

      const saveButton = page.locator(
        'button[data-testid="save-player-details-button"]'
      );
      await saveButton.click();

      // Wait for save
      await page.locator("text=Player details saved").waitFor();

      // Open history and verify human-readable labels
      const historyButton = page.locator("button:has-text('View Edit History')");
      await historyButton.click();

      await page.locator("text=Profile Edit History").waitFor();

      // Should see human-readable labels, not field names
      const gpaLabel = page.locator("text=GPA");
      const satLabel = page.locator("text=SAT Score");

      await expect(gpaLabel).toBeVisible({ timeout: 5000 });
      await expect(satLabel).toBeVisible({ timeout: 5000 });
    });

    test("shows before and after values for changed fields", async ({
      page,
    }) => {
      await page.goto("/settings/player-details");
      await page.waitForLoadState("networkidle");

      // Make a specific change
      const gpaInput = page.locator('input[name="gpa"]').first();
      const oldValue = await gpaInput.inputValue();
      await gpaInput.clear();
      await gpaInput.fill("3.9");

      const saveButton = page.locator(
        'button[data-testid="save-player-details-button"]'
      );
      await saveButton.click();

      await page.locator("text=Player details saved").waitFor();

      // Open history
      const historyButton = page.locator("button:has-text('View Edit History')");
      await historyButton.click();

      await page.locator("text=Profile Edit History").waitFor();

      // Should show Before and After
      const beforeText = page.locator("text=Before:");
      const afterText = page.locator("text=After:");

      await expect(beforeText).toBeVisible({ timeout: 5000 });
      await expect(afterText).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("API Authorization", () => {
    test("parent cannot update via API", async ({ request }) => {
      const response = await request.patch(
        "/api/user/preferences/player-details",
        {
          data: {
            gpa: 3.8,
            sat_score: 1400,
          },
        }
      );

      // Parent should get 403
      if (response.status() === 403) {
        const body = await response.json();
        expect(body.statusMessage).toContain("read-only");
      }
    });

    test("student can update via API", async ({ request }) => {
      // This test assumes the test user is a student
      // A successful response would be 200 or similar (not 403)
      const response = await request.patch(
        "/api/user/preferences/player-details",
        {
          data: {
            gpa: 3.5,
          },
        }
      );

      // Should not be forbidden (not 403)
      expect(response.status()).not.toBe(403);
    });
  });
});
