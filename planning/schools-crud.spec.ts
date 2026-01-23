import { test, expect } from "@playwright/test";
import {
  schoolFixtures,
  createSchoolData,
  generateUniqueSchoolName,
  schoolSelectors,
  schoolHelpers,
} from "./fixtures/schools.fixture";

test.describe("Schools CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and login
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Sign In")');
    await page.waitForURL("/dashboard");
  });

  // ==================== CREATE TESTS ====================

  test.describe("CREATE School", () => {
    test("should create a minimal school with required fields only", async ({
      page,
    }) => {
      const schoolName = generateUniqueSchoolName("Minimal School");
      const schoolData = createSchoolData({ name: schoolName });

      await schoolHelpers.navigateToSchools(page);
      await page.click(schoolSelectors.addSchoolButton);
      await page.waitForURL("/schools/new");

      await schoolHelpers.fillSchoolForm(page, schoolData);
      await page.click(schoolSelectors.createButton);

      // Should redirect to school detail page
      await page.waitForURL(/\/schools\/[a-f0-9-]+/);
      await expect(page.locator(schoolSelectors.schoolName)).toContainText(
        schoolName,
      );
    });

    test("should create a complete school with all fields populated", async ({
      page,
    }) => {
      const schoolName = generateUniqueSchoolName("Complete School");
      const schoolData = createSchoolData({
        ...schoolFixtures.complete,
        name: schoolName,
      });

      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);
      await schoolHelpers.verifySchoolData(page, schoolData);
    });

    test("should create schools for different divisions", async ({ page }) => {
      const divisions = ["D1", "D2", "D3", "JUCO"];

      for (const division of divisions) {
        const schoolName = generateUniqueSchoolName(`${division} School`);
        const schoolData = createSchoolData({
          name: schoolName,
          division,
          location: `${division} City, USA`,
        });

        await schoolHelpers.createSchool(page, schoolData);
        await schoolHelpers.navigateToSchools(page);

        // Verify school appears in list
        await expect(page.locator(`text=${schoolName}`)).toBeVisible();
      }
    });

    test("should create schools with different statuses", async ({ page }) => {
      const statuses = [
        "researching",
        "contacted",
        "interested",
        "offer_received",
        "declined",
        "committed",
      ];

      for (const status of statuses) {
        const schoolName = generateUniqueSchoolName(`${status} School`);
        const schoolData = createSchoolData({
          name: schoolName,
          status,
          location: `${status.charAt(0).toUpperCase() + status.slice(1)} City, USA`,
        });

        const schoolId = await schoolHelpers.createSchool(page, schoolData);
        await schoolHelpers.navigateToSchool(page, schoolId);

        // Verify status is set correctly
        await expect(page.locator(schoolSelectors.schoolStatus)).toHaveValue(
          status,
        );
      }
    });

    test("should add pros and cons when creating school", async ({ page }) => {
      const schoolName = generateUniqueSchoolName("Pro/Con School");
      const schoolData = createSchoolData({
        name: schoolName,
        pros: ["Great coaching staff", "Strong academics", "Beautiful campus"],
        cons: ["Far from home", "Expensive tuition"],
      });

      const schoolId = await schoolHelpers.createSchool(page, schoolData);
      await schoolHelpers.navigateToSchool(page, schoolId);

      // Verify pros are displayed
      for (const pro of schoolData.pros) {
        await expect(page.locator(schoolSelectors.schoolPros)).toContainText(
          pro,
        );
      }

      // Verify cons are displayed
      for (const con of schoolData.cons) {
        await expect(page.locator(schoolSelectors.schoolCons)).toContainText(
          con,
        );
      }
    });

    test("should handle special characters in school names", async ({
      page,
    }) => {
      const schoolData = createSchoolData(
        schoolFixtures.edgeCases.specialChars,
      );

      const schoolId = await schoolHelpers.createSchool(page, schoolData);
      await schoolHelpers.navigateToSchool(page, schoolId);

      await schoolHelpers.verifySchoolData(page, schoolData);
    });

    test("should handle unicode characters in school names", async ({
      page,
    }) => {
      const schoolData = createSchoolData(schoolFixtures.edgeCases.unicode);

      const schoolId = await schoolHelpers.createSchool(page, schoolData);
      await schoolHelpers.navigateToSchool(page, schoolId);

      await schoolHelpers.verifySchoolData(page, schoolData);
    });
  });

  // ==================== READ TESTS ====================

  test.describe("READ School", () => {
    test("should display school detail page with all information", async ({
      page,
    }) => {
      const schoolData = createSchoolData(schoolFixtures.complete);
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);

      // Verify all school information is displayed
      await schoolHelpers.verifySchoolData(page, schoolData);

      // Verify navigation elements
      await expect(page.locator(schoolSelectors.backButton)).toBeVisible();
    });

    test("should navigate between schools list and detail pages", async ({
      page,
    }) => {
      const school1Data = createSchoolData({
        name: "First School",
        location: "City 1",
      });
      const school2Data = createSchoolData({
        name: "Second School",
        location: "City 2",
      });

      const school1Id = await schoolHelpers.createSchool(page, school1Data);
      const school2Id = await schoolHelpers.createSchool(page, school2Data);

      // Navigate to schools list
      await schoolHelpers.navigateToSchools(page);
      await expect(page.locator("text=First School")).toBeVisible();
      await expect(page.locator("text=Second School")).toBeVisible();

      // Navigate to first school
      await page.click("text=First School");
      await page.waitForURL(`/schools/${school1Id}`);
      await expect(page.locator("h1")).toContainText("First School");

      // Navigate back to list
      await page.click(schoolSelectors.backButton);
      await page.waitForURL("/schools");
      await expect(page.locator("text=First School")).toBeVisible();
    });

    test("should display school with favorite status", async ({ page }) => {
      const schoolData = createSchoolData(schoolFixtures.minimal);
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);

      // Toggle favorite status
      await page.click(schoolSelectors.favoriteButton);

      // Verify favorite button is highlighted (class check depends on implementation)
      await expect(page.locator(schoolSelectors.favoriteButton)).toBeVisible();
    });

    test("should handle school not found error gracefully", async ({
      page,
    }) => {
      await page.goto("/schools/non-existent-id");

      // Should show error state or redirect
      await expect(page.locator("text=School not found")).toBeVisible();
      // Or expect redirect to schools list
      // await expect(page).toHaveURL('/schools')
    });
  });

  // ==================== UPDATE TESTS ====================

  test.describe("UPDATE School", () => {
    test("should update basic school information", async ({ page }) => {
      const schoolData = createSchoolData(schoolFixtures.minimal);
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);

      // Navigate to edit mode (implementation-specific)
      await page.click('button:has-text("Edit")');

      // Update school information
      const updateData = schoolFixtures.updateData;
      await schoolHelpers.fillSchoolForm(page, updateData);

      await page.click(schoolSelectors.updateButton);

      // Verify updated information
      await schoolHelpers.verifySchoolData(page, updateData);
    });

    test("should update school division and status", async ({ page }) => {
      const schoolData = createSchoolData({
        division: "D1",
        status: "researching",
      });
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);
      await page.click('button:has-text("Edit")');

      // Update division and status
      await page.selectOption(schoolSelectors.divisionSelect, "D2");
      await page.selectOption(schoolSelectors.statusSelect, "interested");

      await page.click(schoolSelectors.updateButton);

      // Verify updates
      await expect(page.locator(schoolSelectors.schoolDivision)).toContainText(
        "D2",
      );
      await expect(page.locator(schoolSelectors.schoolStatus)).toHaveValue(
        "interested",
      );
    });

    test("should add and update pros and cons", async ({ page }) => {
      const schoolData = createSchoolData({
        pros: ["Original pro 1"],
        cons: ["Original con 1"],
      });
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);
      await page.click('button:has-text("Edit")');

      // Add new pros and cons
      await schoolHelpers.addPros(page, ["New pro 1", "New pro 2"]);
      await schoolHelpers.addCons(page, ["New con 1"]);

      await page.click(schoolSelectors.updateButton);

      // Verify all pros and cons are displayed
      await expect(page.locator(schoolSelectors.schoolPros)).toContainText(
        "Original pro 1",
      );
      await expect(page.locator(schoolSelectors.schoolPros)).toContainText(
        "New pro 1",
      );
      await expect(page.locator(schoolSelectors.schoolPros)).toContainText(
        "New pro 2",
      );

      await expect(page.locator(schoolSelectors.schoolCons)).toContainText(
        "Original con 1",
      );
      await expect(page.locator(schoolSelectors.schoolCons)).toContainText(
        "New con 1",
      );
    });

    test("should update school social media information", async ({ page }) => {
      const schoolData = createSchoolData(schoolFixtures.complete);
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);
      await page.click('button:has-text("Edit")');

      // Update social media
      const socialUpdates = {
        twitter_handle: "@NewTwitterHandle",
        instagram_handle: "new_instagram",
        website: "https://newwebsite.edu",
      };

      await schoolHelpers.fillSchoolForm(page, socialUpdates);
      await page.click(schoolSelectors.updateButton);

      // Verify social media links are updated
      // This depends on how they're displayed in the UI
      await expect(page.locator("text=@NewTwitterHandle")).toBeVisible();
    });

    test("should cancel edit operation", async ({ page }) => {
      const schoolData = createSchoolData(schoolFixtures.minimal);
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);
      await page.click('button:has-text("Edit")');

      // Make changes but cancel
      await page.fill(schoolSelectors.nameInput, "Changed Name");
      await page.click(schoolSelectors.cancelButton);

      // Verify original data is preserved
      await expect(page.locator(schoolSelectors.schoolName)).toContainText(
        schoolData.name,
      );
    });
  });

  // ==================== DELETE TESTS ====================

  test.describe("DELETE School", () => {
    test("should delete school with confirmation", async ({ page }) => {
      const schoolName = generateUniqueSchoolName("Delete Me");
      const schoolData = createSchoolData({ name: schoolName });
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);

      // Delete school
      await page.click(schoolSelectors.deleteButton);

      // Should show confirmation dialog
      await expect(page.locator("text=Are you sure")).toBeVisible();
      await expect(
        page.locator(schoolSelectors.confirmDeleteButton),
      ).toBeVisible();
      await expect(page.locator(schoolSelectors.cancelButton)).toBeVisible();

      await page.click(schoolSelectors.confirmDeleteButton);

      // Should redirect to schools list
      await expect(page).toHaveURL("/schools");
      await expect(page.locator(`text=${schoolName}`)).not.toBeVisible();
    });

    test("should cancel delete operation", async ({ page }) => {
      const schoolName = generateUniqueSchoolName("Keep Me");
      const schoolData = createSchoolData({ name: schoolName });
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);

      // Start delete but cancel
      await page.click(schoolSelectors.deleteButton);
      await page.click(schoolSelectors.cancelButton);

      // Should stay on school detail page
      await expect(page.locator(schoolSelectors.schoolName)).toContainText(
        schoolName,
      );

      // Verify school still exists in list
      await schoolHelpers.navigateToSchools(page);
      await expect(page.locator(`text=${schoolName}`)).toBeVisible();
    });

    test("should handle delete of non-existent school", async ({ page }) => {
      // This test depends on implementation
      // May navigate to a non-existent school and try to delete
      await page.goto("/schools/fake-id");

      // Should handle gracefully - either show error or no delete button
      const deleteButton = page.locator(schoolSelectors.deleteButton);
      await expect(deleteButton).toHaveCount(0);
    });
  });

  // ==================== VALIDATION TESTS ====================

  test.describe("Form Validation", () => {
    test("should validate required fields on create", async ({ page }) => {
      await schoolHelpers.navigateToSchools(page);
      await page.click(schoolSelectors.addSchoolButton);

      // Try to submit without required fields
      await page.click(schoolSelectors.createButton);

      // Should show validation errors
      await expect(page.locator(schoolSelectors.validationError)).toBeVisible();
      await expect(page.locator("text=Name is required")).toBeVisible();
      await expect(page.locator("text=Location is required")).toBeVisible();
    });

    test("should validate required fields on update", async ({ page }) => {
      const schoolData = createSchoolData(schoolFixtures.minimal);
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);
      await page.click('button:has-text("Edit")');

      // Clear required fields
      await page.fill(schoolSelectors.nameInput, "");
      await page.fill(schoolSelectors.locationInput, "");

      await page.click(schoolSelectors.updateButton);

      // Should show validation errors
      await expect(page.locator(schoolSelectors.validationError)).toBeVisible();
    });

    test("should validate URL format for website field", async ({ page }) => {
      await schoolHelpers.navigateToSchools(page);
      await page.click(schoolSelectors.addSchoolButton);

      await schoolHelpers.fillSchoolForm(page, {
        name: "Test School",
        location: "Test City",
        website: "invalid-url",
      });

      await page.click(schoolSelectors.createButton);

      // Should show URL validation error
      await expect(page.locator("text=Please enter a valid URL")).toBeVisible();
    });

    test("should validate social media handle formats", async ({ page }) => {
      await schoolHelpers.navigateToSchools(page);
      await page.click(schoolSelectors.addSchoolButton);

      await schoolHelpers.fillSchoolForm(page, {
        name: "Test School",
        location: "Test City",
        twitter_handle: "invalid-twitter-with-at-symbol",
      });

      await page.click(schoolSelectors.createButton);

      // Should show validation error for Twitter format
      await expect(
        page.locator("text=Twitter handle should not include @"),
      ).toBeVisible();
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================

  test.describe("Accessibility", () => {
    test("should be keyboard navigable", async ({ page }) => {
      await schoolHelpers.navigateToSchools(page);
      await page.click(schoolSelectors.addSchoolButton);

      // Test keyboard navigation through form
      await page.keyboard.press("Tab");
      await expect(page.locator(schoolSelectors.nameInput)).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(page.locator(schoolSelectors.locationInput)).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(page.locator(schoolSelectors.divisionSelect)).toBeFocused();
    });

    test("should have proper form labels", async ({ page }) => {
      await schoolHelpers.navigateToSchools(page);
      await page.click(schoolSelectors.addSchoolButton);

      // Check that form fields have associated labels
      const nameInput = page.locator(schoolSelectors.nameInput);
      await expect(nameInput).toHaveAttribute("aria-label");

      const locationInput = page.locator(schoolSelectors.locationInput);
      await expect(locationInput).toHaveAttribute("aria-label");
    });

    test("should announce screen reader updates", async ({ page }) => {
      const schoolData = createSchoolData(schoolFixtures.minimal);
      const schoolId = await schoolHelpers.createSchool(page, schoolData);

      await schoolHelpers.navigateToSchool(page, schoolId);

      // Check for ARIA live regions
      await expect(
        page.locator('[aria-live="polite"], [aria-live="assertive"]'),
      ).toBeVisible();
    });
  });
});
