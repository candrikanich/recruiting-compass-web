import { BasePage } from "./BasePage";
import { Page } from "@playwright/test";

export class AdminPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto("/admin");
  }

  // Select mode operations
  async clickSelectModeToggle() {
    await this.click('[data-testid="select-mode-toggle"]');
  }

  async isSelectModeActive(): Promise<boolean> {
    const button = this.page.locator('[data-testid="select-mode-toggle"]');
    const text = await button.textContent();
    return text?.includes("Exit") || false;
  }

  // Checkbox operations
  async selectUser(index: number) {
    const checkboxes = this.page.locator('[data-testid="user-checkbox"]');
    const checkbox = checkboxes.nth(index);
    await checkbox.click();
  }

  async selectAllUsers() {
    await this.click('[data-testid="select-all-checkbox"]');
  }

  async isUserSelected(index: number): Promise<boolean> {
    const checkboxes = this.page.locator('[data-testid="user-checkbox"]');
    const checkbox = checkboxes.nth(index);
    return await checkbox.isChecked();
  }

  async getSelectedUserCount(): Promise<number> {
    const selectedCheckboxes = this.page.locator(
      '[data-testid="user-checkbox"]:checked'
    );
    return await selectedCheckboxes.count();
  }

  // Bulk delete operations
  async clickBulkDeleteButton() {
    await this.click('[data-testid="bulk-delete-btn"]');
  }

  async isBulkDeleteButtonVisible(): Promise<boolean> {
    return await this.isVisible('[data-testid="bulk-delete-btn"]');
  }

  // Modal operations
  async clickConfirmBulkDelete() {
    await this.click('[data-testid="confirm-bulk-delete"]');
  }

  async clickCancelBulkDelete() {
    await this.click('[data-testid="cancel-bulk-delete"]');
  }

  async isConfirmModalVisible(): Promise<boolean> {
    return await this.isVisible('[data-testid="confirm-bulk-delete"]');
  }

  // User table operations
  async getUserCount(): Promise<number> {
    return await this.getCount('tbody tr');
  }

  async getUserEmail(index: number): Promise<string> {
    const rows = this.page.locator('tbody tr');
    const row = rows.nth(index);
    const emailCell = row.locator('td:nth-child(2) code');
    return await emailCell.textContent() || '';
  }

  // Verification helpers
  async verifyUserRemovedFromTable(email: string): Promise<boolean> {
    const emailLocator = this.page.locator(`code:has-text("${email}")`);
    return !(await emailLocator.isVisible());
  }

  async verifySelectModeVisible(): Promise<boolean> {
    const firstCheckbox = this.page.locator(
      '[data-testid="user-checkbox"]'
    ).first();
    return await firstCheckbox.isVisible().catch(() => false);
  }

  async verifySelectModeHidden(): Promise<boolean> {
    const firstCheckbox = this.page.locator(
      '[data-testid="user-checkbox"]'
    ).first();
    return !(await firstCheckbox.isVisible().catch(() => false));
  }

  async waitForBulkDeleteCompletion() {
    // Wait for bulk delete button to no longer show "Deleting..."
    await this.page.waitForFunction(() => {
      const button = document.querySelector('[data-testid="bulk-delete-btn"]');
      return button && !button.textContent?.includes('Deleting');
    });
  }
}
