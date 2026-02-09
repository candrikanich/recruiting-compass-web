import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";
import {
  schoolHelpers,
  createSchoolData,
  generateUniqueSchoolName,
} from "./fixtures/schools.fixture";
import {
  documentFixtures,
  documentSelectors,
  documentHelpers,
} from "./fixtures/documents.fixture";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("School Detail - Document Management", () => {
  let schoolId: string;
  const sampleFilePath = path.join(
    __dirname,
    "fixtures",
    "files",
    "sample-transcript.txt",
  );

  test.beforeEach(async ({ page }) => {
    await authFixture.loginFast(page, "player");

    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("Docs Test"),
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
  });

  test("should show empty state when no documents exist", async ({ page }) => {
    const emptyState = page.locator(documentSelectors.emptyState);
    await expect(emptyState).toBeVisible();

    const uploadButton = page.locator(documentSelectors.uploadButton);
    await expect(uploadButton).toBeVisible();
  });

  test("should upload document successfully", async ({ page }) => {
    const doc = documentFixtures.transcript;

    await documentHelpers.uploadDocument(page, {
      type: doc.type,
      title: doc.title,
      description: doc.description,
      filePath: sampleFilePath,
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    const isDocumentVisible = await documentHelpers.verifyDocumentInList(
      page,
      doc.title,
      doc.type,
    );
    expect(isDocumentVisible).toBe(true);
  });

  test("should show validation errors for missing required fields", async ({
    page,
  }) => {
    await page.click(documentSelectors.uploadButton);
    await page.waitForSelector(documentSelectors.modal);

    await page.click(documentSelectors.submitButton);

    const errorMessages = page.locator(".error, .text-red-600, .text-red-500");
    const errorCount = await errorMessages.count();

    expect(errorCount).toBeGreaterThan(0);
  });

  test("should navigate to document detail page", async ({ page }) => {
    const doc = documentFixtures.resume;

    await documentHelpers.uploadDocument(page, {
      type: doc.type,
      title: doc.title,
      description: doc.description,
      filePath: sampleFilePath,
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    const viewLink = page.locator(documentSelectors.viewLink).first();
    await viewLink.click();

    await page.waitForURL(/\/documents\/[a-f0-9-]+/);
    expect(page.url()).toContain("/documents/");
  });

  test("should display multiple documents in list", async ({ page }) => {
    const docs = [
      {
        ...documentFixtures.transcript,
        filePath: sampleFilePath,
      },
      {
        ...documentFixtures.resume,
        filePath: path.join(
          __dirname,
          "fixtures",
          "files",
          "sample-resume.txt",
        ),
      },
      {
        ...documentFixtures.video,
        filePath: path.join(__dirname, "fixtures", "files", "sample-video.txt"),
      },
    ];

    for (const doc of docs) {
      await documentHelpers.uploadDocument(page, doc);
      await page.waitForTimeout(500);
    }

    await page.reload();
    await page.waitForLoadState("networkidle");

    const docCount = await documentHelpers.getDocumentCount(page);
    expect(docCount).toBeGreaterThanOrEqual(3);

    for (const doc of docs) {
      const isVisible = await documentHelpers.verifyDocumentInList(
        page,
        doc.title,
        doc.type,
      );
      expect(isVisible).toBe(true);
    }
  });

  test("should close upload modal on cancel", async ({ page }) => {
    await page.click(documentSelectors.uploadButton);
    await page.waitForSelector(documentSelectors.modal);

    const cancelButton = page.locator('button:has-text("Cancel")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await page.waitForTimeout(500);

      const modalVisible = await page
        .locator(documentSelectors.modal)
        .isVisible();
      expect(modalVisible).toBe(false);
    }
  });
});
