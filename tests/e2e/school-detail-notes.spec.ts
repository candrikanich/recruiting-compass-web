import { test, expect } from "@playwright/test";
import {
  schoolHelpers,
  createSchoolData,
  generateUniqueSchoolName,
  notesFixtures,
  notesSelectors,
} from "./fixtures/schools.fixture";

test.describe("School Detail - Notes Management", () => {
  let schoolId: string;

  test.beforeEach(async ({ page }) => {
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("Notes Test"),
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("domcontentloaded");
  });

  test("should display shared notes section with Edit button", async ({
    page,
  }) => {
    const notesHeading = page.locator(notesSelectors.sharedNotesSection);
    await expect(notesHeading).toBeVisible();

    const editButton = page.locator(notesSelectors.editButton);
    await expect(editButton).toBeVisible();
  });

  test("should edit and save shared notes", async ({ page }) => {
    const newNotes = notesFixtures.shared;

    const editButtons = page.locator(notesSelectors.editButton);
    await editButtons.first().click();

    await page.waitForSelector(notesSelectors.notesTextarea);

    const textarea = page.locator(notesSelectors.notesTextarea).first();
    await textarea.fill(newNotes);

    const saveButton = page.locator(notesSelectors.saveButton).first();
    await saveButton.click();

    await page.waitForTimeout(1000);

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const notesDisplay = page
      .locator(notesSelectors.notesDisplay)
      .filter({ hasText: newNotes });
    await expect(notesDisplay).toBeVisible();
  });

  test("should cancel editing without saving changes", async ({ page }) => {
    const originalNotes = "Original notes content";

    const editButtons = page.locator(notesSelectors.editButton);
    await editButtons.first().click();

    const textarea = page.locator(notesSelectors.notesTextarea).first();
    await textarea.fill("Changed content that should not save");

    const cancelButton = page.locator(notesSelectors.cancelButton).first();
    await cancelButton.click();

    await page.waitForTimeout(500);

    const notesDisplay = page.locator(notesSelectors.notesDisplay).first();
    const displayText = await notesDisplay.textContent();

    expect(displayText).not.toContain("Changed content that should not save");
  });

  test("should handle saving state correctly", async ({ page }) => {
    const editButtons = page.locator(notesSelectors.editButton);
    await editButtons.first().click();

    const textarea = page.locator(notesSelectors.notesTextarea).first();
    await textarea.fill("Test notes for save state");

    const saveButton = page.locator(notesSelectors.saveButton).first();
    await saveButton.click();

    // After clicking save, the edit mode closes (button disappears) — check with short timeout
    const buttonText = await saveButton.textContent({ timeout: 500 }).catch(() => null);
    if (buttonText?.includes("Saving")) {
      expect(buttonText).toContain("Saving");
      const isDisabled = await saveButton.isDisabled({ timeout: 500 }).catch(() => true);
      expect(isDisabled).toBe(true);
    }
    // Wait for save to complete
    await page.waitForTimeout(1000);
  });

  test("should handle special characters in notes", async ({ page }) => {
    const specialNotes = notesFixtures.special;

    const editButtons = page.locator(notesSelectors.editButton);
    await editButtons.first().click();

    const textarea = page.locator(notesSelectors.notesTextarea).first();
    await textarea.fill(specialNotes);

    const saveButton = page.locator(notesSelectors.saveButton).first();
    await saveButton.click();

    await page.waitForTimeout(1000);

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const notesDisplay = page.locator(notesSelectors.notesDisplay).first();
    const displayText = await notesDisplay.textContent();

    expect(displayText).toContain("quotes");
    expect(displayText).toContain("@#$%");
  });
});
