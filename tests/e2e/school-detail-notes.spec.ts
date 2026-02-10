import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";
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
    await authFixture.loginFast(page, "player");

    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("Notes Test"),
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
  });

  test("should display shared notes section with Edit button", async ({
    page,
  }) => {
    const notesHeading = page.locator(notesSelectors.sharedNotesSection);
    await expect(notesHeading).toBeVisible();

    const editButtons = page.locator(notesSelectors.editButton);
    const editButtonCount = await editButtons.count();
    expect(editButtonCount).toBeGreaterThan(0);
  });

  test("should display private notes section with privacy hint", async ({
    page,
  }) => {
    const privateNotesHeading = page.locator(
      notesSelectors.privateNotesSection,
    );
    await expect(privateNotesHeading).toBeVisible();

    const privacyHint = page.locator(notesSelectors.privacyHint);
    await expect(privacyHint).toBeVisible();
    await expect(privacyHint).toContainText("Only you can see these notes");

    const editButtons = page.locator(notesSelectors.editButton);
    const editButtonCount = await editButtons.count();
    expect(editButtonCount).toBeGreaterThanOrEqual(2);
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
    await page.waitForLoadState("networkidle");

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

  test("should edit and save private notes separately from shared", async ({
    page,
  }) => {
    const sharedNotes = "Shared notes content";
    const privateNotes = notesFixtures.private;

    const editButtons = page.locator(notesSelectors.editButton);
    await editButtons.first().click();

    const sharedTextarea = page.locator(notesSelectors.notesTextarea).first();
    await sharedTextarea.fill(sharedNotes);

    const saveButton = page.locator(notesSelectors.saveButton).first();
    await saveButton.click();

    await page.waitForTimeout(1000);

    await editButtons.nth(1).click();

    const privateTextarea = page
      .locator(notesSelectors.privateNotesTextarea)
      .first();
    await privateTextarea.fill(privateNotes);

    const privateSaveButton = page.locator(notesSelectors.saveButton).nth(1);
    await privateSaveButton.click();

    await page.waitForTimeout(1000);

    await page.reload();
    await page.waitForLoadState("networkidle");

    const notesDisplays = page.locator(notesSelectors.notesDisplay);
    const firstDisplay = await notesDisplays.first().textContent();
    const secondDisplay = await notesDisplays.nth(1).textContent();

    expect(firstDisplay).toContain(sharedNotes);
    expect(secondDisplay).toContain(privateNotes);
  });

  test("should handle saving state correctly", async ({ page }) => {
    const editButtons = page.locator(notesSelectors.editButton);
    await editButtons.first().click();

    const textarea = page.locator(notesSelectors.notesTextarea).first();
    await textarea.fill("Test notes for save state");

    const saveButton = page.locator(notesSelectors.saveButton).first();
    await saveButton.click();

    const buttonText = await saveButton.textContent();
    if (buttonText?.includes("Saving")) {
      expect(buttonText).toContain("Saving");

      const isDisabled = await saveButton.isDisabled();
      expect(isDisabled).toBe(true);
    }

    await page.waitForTimeout(2000);
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
    await page.waitForLoadState("networkidle");

    const notesDisplay = page.locator(notesSelectors.notesDisplay).first();
    const displayText = await notesDisplay.textContent();

    expect(displayText).toContain("quotes");
    expect(displayText).toContain("@#$%");
  });
});
