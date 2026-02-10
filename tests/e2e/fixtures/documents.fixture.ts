import type { Page } from "@playwright/test";

/**
 * Document data fixtures for E2E testing
 * Provides consistent test data for document management
 */

export const documentFixtures = {
  transcript: {
    type: "transcript",
    title: "Fall 2025 Transcript",
    description: "Academic record for fall semester",
  },
  video: {
    type: "video",
    title: "Game Highlights",
    description: "Championship game footage",
  },
  resume: {
    type: "resume",
    title: "Athletic Resume",
    description: "2025 season summary",
  },
  recommendation: {
    type: "recommendation",
    title: "Coach Recommendation Letter",
    description: "Letter from varsity coach",
  },
  other: {
    type: "other",
    title: "Additional Materials",
    description: "Supplementary documents",
  },
};

export const documentSelectors = {
  uploadButton: 'button:has-text("Upload")',
  modal: "[role='dialog']",
  typeSelect: 'select[name="type"]',
  titleInput: 'input[name="title"]',
  descriptionTextarea: 'textarea[name="description"]',
  fileInput: 'input[type="file"]',
  submitButton: 'button:has-text("Upload"):not(:has-text("Upload Document"))',
  documentList: ".space-y-3",
  documentItem: ".flex.items-center.justify-between",
  viewLink: 'a:has-text("View")',
  emptyState: "text=No documents shared",
  documentTitle: ".font-medium.text-slate-900",
  documentType: ".text-xs.text-slate-500.capitalize",
};

export const documentHelpers = {
  /**
   * Upload a document to a school
   */
  async uploadDocument(
    page: Page,
    data: {
      type: string;
      title: string;
      description?: string;
      filePath: string;
    },
  ) {
    // Click upload button
    await page.click(documentSelectors.uploadButton);

    // Wait for modal to open
    await page.waitForSelector(documentSelectors.modal);

    // Fill form
    await page.selectOption(documentSelectors.typeSelect, data.type);
    await page.fill(documentSelectors.titleInput, data.title);

    if (data.description) {
      await page.fill(documentSelectors.descriptionTextarea, data.description);
    }

    // Upload file
    await page.setInputFiles(documentSelectors.fileInput, data.filePath);

    // Submit form
    await page.click(documentSelectors.submitButton);

    // Wait for upload to complete
    await page.waitForTimeout(2000);
  },

  /**
   * Get count of documents displayed
   */
  async getDocumentCount(page: Page): Promise<number> {
    const items = await page.locator(documentSelectors.documentItem).count();
    return items;
  },

  /**
   * Verify document appears in list
   */
  async verifyDocumentInList(
    page: Page,
    title: string,
    type: string,
  ): Promise<boolean> {
    const titleLocator = page.locator(documentSelectors.documentTitle, {
      hasText: title,
    });
    const typeLocator = page.locator(documentSelectors.documentType, {
      hasText: type,
    });

    const titleVisible = await titleLocator.isVisible();
    const typeVisible = await typeLocator.isVisible();

    return titleVisible && typeVisible;
  },
};
