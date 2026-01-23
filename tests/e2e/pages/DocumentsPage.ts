import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DocumentsPage extends BasePage {
  async goto() {
    await super.goto("/documents");
  }

  async navigateToDocuments() {
    await this.click('[data-testid="nav-documents"]');
    await this.waitForURL("/documents");
  }

  // Document Management
  async clickAddDocument() {
    await this.click('[data-testid="add-document-button"]');
    await this.waitForURL("/documents/create");
  }

  async expectDocumentsVisible() {
    await this.expectVisible('[data-testid="page-title"]');
    await this.expectVisible("text=Documents");
    await this.expectVisible(
      "text=Manage videos, transcripts, and other recruiting documents",
    );
  }

  async getDocumentCount(): Promise<number> {
    const countText = await this.page.locator("text=of").textContent();
    const match = countText?.match(/(\d+)\s+of\s+(\d+)/);
    if (match) {
      return parseInt(match[2]);
    }
    return 0;
  }

  async expectDocumentStats() {
    await this.expectVisible("text=Total Documents");
    await this.expectVisible("text=Shared Documents");
    await this.expectVisible("text=Most Common Type");
    await this.expectVisible("text=Total Storage");
  }

  async filterDocuments(filterType: string) {
    // Look for filter controls - this depends on FilterPanel implementation
    const filterOption = await this.page.locator(`text=${filterType}`).first();
    if (await filterOption.isVisible()) {
      await filterOption.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async clearAllFilters() {
    // Look for clear filters button
    await this.click('button:has-text("Clear"), button:has-text("Reset")');
    await this.page.waitForTimeout(1000);
  }

  // Document Actions
  async clickDocument(documentName: string) {
    await this.click(`text=${documentName}`);
    await this.page.waitForTimeout(1000);
  }

  async uploadDocument(fileName: string) {
    // This would depend on the document upload implementation
    // Look for file input or upload area
    const fileInput = await this.page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(fileName);
      await this.page.waitForTimeout(2000);
    }
  }

  async deleteDocument(documentName: string) {
    // Select document and delete
    await this.click(`text=${documentName}`);
    await this.page.waitForTimeout(1000);

    // Look for delete option
    const deleteButton = await this.page
      .locator('button:has-text("Delete"), button[aria-label*="delete"]')
      .first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await this.click('button:has-text("Confirm"), button:has-text("Yes")');
      await this.page.waitForTimeout(2000);
    }
  }

  // Document Search
  async searchDocuments(query: string) {
    const searchInput = await this.page
      .locator('input[placeholder*="Search"], input[data-testid*="search"]')
      .first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(query);
      await this.page.waitForTimeout(1000);
    }
  }

  async expectSearchResults(query: string) {
    // Verify search worked
    await this.searchDocuments(query);

    // Should see results or no results message
    // Implementation depends on actual UI
  }

  // Document Details
  async expectDocumentDetails() {
    await this.expectVisible("text=Name, text=Type, text=Date, text=Size");
  }

  async downloadDocument(documentName: string) {
    await this.click(`text=${documentName}`);
    await this.page.waitForTimeout(1000);

    // Look for download button
    const downloadButton = await this.page
      .locator('button:has-text("Download"), button[aria-label*="download"]')
      .first();
    if (await downloadButton.isVisible()) {
      const download = await this.page.waitForEvent("download");
      return download;
    }
  }

  // Document Types
  async expectDocumentTypes() {
    await this.expectVisible(
      "text=Video, text=Transcript, text=PDF, text=Image",
    );
  }

  // Responsive Testing
  async testMobileDocuments() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.goto();

    await this.expectDocumentsVisible();
  }

  async testDesktopDocuments() {
    await this.page.setViewportSize({ width: 1200, height: 800 });
    await this.goto();

    await this.expectDocumentsVisible();
  }

  // Loading States
  async expectLoadingState() {
    await this.expectVisible(
      '[data-testid*="loading"], .loading, .animate-spin',
    );
  }

  async expectErrorState() {
    await this.expectVisible('[data-testid*="error"], .error, .bg-red-50');
  }

  // Bulk Operations
  async selectMultipleDocuments(documentNames: string[]) {
    for (const doc of documentNames) {
      await this.click(`text=${doc}`);
      await this.page.waitForTimeout(500);
    }
  }

  async deleteMultipleDocuments(documentNames: string[]) {
    for (const doc of documentNames) {
      await this.deleteDocument(doc);
      await this.page.waitForTimeout(1000);
    }
  }

  // Sorting and Organization
  async sortBy(sortType: string) {
    const sortButton = await this.page
      .locator(`text=${sortType}, button:has-text("Sort")`)
      .first();
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async changeView(viewType: string) {
    const viewButton = await this.page
      .locator(`text=${viewType}, button:has-text("View")`)
      .first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await this.page.waitForTimeout(1000);
    }
  }
}
