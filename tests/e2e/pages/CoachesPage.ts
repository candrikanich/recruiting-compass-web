import { BasePage } from "./BasePage";
import { expect } from "@playwright/test";

export class CoachesPage extends BasePage {
  // Navigation
  async goto(schoolId?: string) {
    if (schoolId) {
      await super.goto(`/schools/${schoolId}/coaches`);
    } else {
      await super.goto("/coaches");
    }
  }

  async navigateToCoaches() {
    await this.click('[data-testid="nav-coaches"]');
    await this.waitForURL(/coaches/);
  }

  async goToCoachDetail(schoolId: string, coachId: string) {
    await super.goto(`/schools/${schoolId}/coaches/${coachId}`);
    await this.page.waitForLoadState("networkidle");
  }

  async goToCoachCommunications(schoolId: string, coachId: string) {
    await super.goto(`/schools/${schoolId}/coaches/${coachId}/communications`);
    await this.page.waitForLoadState("networkidle");
  }

  // CRUD Operations
  async clickAddCoach() {
    // Look for add coach button or navigate to add coach page
    const addCoachButton = await this.page
      .locator('a[href*="/coaches/new"], button:has-text("Add Coach")')
      .first();
    await addCoachButton.click();
    await this.waitForURL(/\/.*\/coaches\/new/);
  }

  async createCoach(coach: any) {
    // Wait for form to be ready
    await this.waitForElement("#firstName");

    await this.fillInput("#firstName", coach.firstName);
    await this.fillInput("#lastName", coach.lastName);
    await this.selectOption("#role", coach.role);
    await this.fillInput(
      'input[name*="email"], input[type="email"]',
      coach.email,
    );
    await this.fillInput(
      'input[name*="phone"], input[type="tel"]',
      coach.phone,
    );

    if (coach.twitter_handle) {
      const twitterInput = await this.page
        .locator('input[name*="twitter"], input[placeholder*="Twitter"]')
        .first();
      if (await twitterInput.isVisible()) {
        await twitterInput.fill(coach.twitter_handle);
      }
    }

    if (coach.instagram_handle) {
      const instagramInput = await this.page
        .locator('input[name*="instagram"], input[placeholder*="Instagram"]')
        .first();
      if (await instagramInput.isVisible()) {
        await instagramInput.fill(coach.instagram_handle);
      }
    }

    await this.click('[data-testid="add-coach-button"]');
    await this.page.waitForLoadState("networkidle");
  }

  async updateCoach(updates: any) {
    // Click edit button if on detail page
    const editButton = await this.page
      .locator('button:has-text("Edit"), [data-testid="edit-coach"]')
      .first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await this.page.waitForTimeout(500);
    }

    if (updates.firstName) {
      await this.fillInput(
        '#firstName, input[placeholder*="first name"]',
        updates.firstName,
      );
    }
    if (updates.lastName) {
      await this.fillInput(
        '#lastName, input[placeholder*="last name"]',
        updates.lastName,
      );
    }
    if (updates.email) {
      await this.fillInput('input[type="email"]', updates.email);
    }
    if (updates.phone) {
      await this.fillInput('input[type="tel"]', updates.phone);
    }

    const saveButton = await this.page
      .locator('button:has-text("Save"), [data-testid="save-coach"]')
      .first();
    await saveButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  async deleteCoach(coachName: string) {
    // Find and click delete button
    const deleteButton = await this.page
      .locator(`button:has-text("Delete")`)
      .first();
    await deleteButton.click();
    await this.page.waitForTimeout(500);

    // Confirm deletion
    const confirmButton = await this.page
      .locator('button:has-text("Confirm")')
      .first();
    await confirmButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  // Search and Filter
  async searchCoaches(searchTerm: string) {
    const searchInput = await this.page
      .locator('input[placeholder*="Search"], input[type="search"]')
      .first();
    await searchInput.fill(searchTerm);
    await this.page.waitForTimeout(800); // Wait for search to process
  }

  async filterByRole(role: string) {
    const roleFilter = await this.page
      .locator('select[name="role"], button:has-text("Role")')
      .first();
    if ((await roleFilter.getAttribute("role")) === "combobox") {
      await roleFilter.click();
      await this.clickByText(role);
    } else {
      await this.selectOption('select[name="role"]', role);
    }
    await this.page.waitForTimeout(500);
  }

  async sortBy(sortOption: string) {
    const sortDropdown = await this.page
      .locator('select[name="sort"], button:has-text("Sort")')
      .first();
    if (await sortDropdown.isVisible()) {
      if ((await sortDropdown.getAttribute("role")) === "combobox") {
        await sortDropdown.click();
        await this.clickByText(sortOption);
      } else {
        await this.selectOption('select[name="sort"]', sortOption);
      }
      await this.page.waitForTimeout(500);
    }
  }

  async clearFilters() {
    const clearButton = await this.page
      .locator('button:has-text("Clear"), button:has-text("Reset")')
      .first();
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  // Display and Assertions
  async expectCoachInList(firstName: string, lastName: string) {
    const fullName = `${firstName} ${lastName}`;
    await this.expectVisible(`text=${fullName}`);
  }

  async expectCoachNotInList(firstName: string, lastName: string) {
    const fullName = `${firstName} ${lastName}`;
    await this.expectHidden(`text=${fullName}`);
  }

  async viewCoachDetails(coachName: string) {
    await this.clickByText(coachName);
    await this.page.waitForLoadState("networkidle");
  }

  async getCoachCount(): Promise<number> {
    // Look for coach cards or list items
    const cards = await this.page
      .locator('[data-testid="coach-card"], .coach-card, [data-testid="coach-item"], .coach-item')
      .count();
    return cards;
  }

  async expectFilteredResults(expectedCount: number) {
    const actualCount = await this.getCoachCount();
    if (expectedCount === 0) {
      await this.expectVisible('text=No coaches found, text=No results, text=Empty');
    } else {
      expect(actualCount).toBeGreaterThan(0);
    }
  }

  // Contact Information and Details
  async getCoachResponsiveness(): Promise<string> {
    return await this.getText('[data-testid="responsiveness-score"]');
  }

  async getLastContactDate(): Promise<string> {
    return await this.getText('[data-testid="last-contact-date"]');
  }

  async getCoachEmail(): Promise<string> {
    const emailElement = await this.page
      .locator('[data-testid="coach-email"], .coach-email, a[href^="mailto:"]')
      .first();
    if (await emailElement.isVisible()) {
      return await this.getText('[data-testid="coach-email"]');
    }
    return "";
  }

  async getCoachPhone(): Promise<string> {
    return await this.getText('[data-testid="coach-phone"], .coach-phone');
  }

  // Quick Actions
  async clickEmailAction() {
    const emailButton = await this.page
      .locator('button[aria-label*="email"], button:has-text("Email"), a[href^="mailto:"]')
      .first();
    await emailButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickTextAction() {
    const textButton = await this.page
      .locator('button[aria-label*="text"], button:has-text("Text"), a[href^="sms:"]')
      .first();
    await textButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickTwitterAction() {
    const twitterButton = await this.page
      .locator('button[aria-label*="twitter"], a[href*="twitter.com"]')
      .first();
    if (await twitterButton.isVisible()) {
      // Twitter link typically opens in new tab
      const [popup] = await Promise.all([
        this.page.context().waitForEvent("page"),
        twitterButton.click(),
      ]);
      await popup.close();
    }
  }

  async clickInstagramAction() {
    const instagramButton = await this.page
      .locator('button[aria-label*="instagram"], a[href*="instagram.com"]')
      .first();
    if (await instagramButton.isVisible()) {
      // Instagram link typically opens in new tab
      const [popup] = await Promise.all([
        this.page.context().waitForEvent("page"),
        instagramButton.click(),
      ]);
      await popup.close();
    }
  }

  // Communication and History
  async navigateToCommunications() {
    const commButton = await this.page
      .locator('button:has-text("Messages"), a[href*="/communications"]')
      .first();
    await commButton.click();
    await this.waitForURL(/\/communications/);
  }

  async viewCoachAnalytics() {
    const analyticsTab = await this.page
      .locator('[data-testid="analytics-tab"], button:has-text("Analytics")')
      .first();
    if (await analyticsTab.isVisible()) {
      await analyticsTab.click();
      await this.expectVisible('[data-testid="responsiveness-chart"]');
    }
  }

  // Additional helper methods
  async expectCoachFieldValue(fieldSelector: string, expectedValue: string) {
    await expect(this.page.locator(fieldSelector)).toHaveValue(expectedValue);
  }

  async expectCoachDisplayValue(selector: string, expectedValue: string) {
    await this.expectText(selector, expectedValue);
  }

  async waitForCoachsToLoad() {
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(500); // Additional wait for animations
  }
}
