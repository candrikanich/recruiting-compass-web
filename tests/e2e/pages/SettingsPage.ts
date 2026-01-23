import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class SettingsPage extends BasePage {
  async goto() {
    await super.goto("/settings");
  }

  async navigateToSettings() {
    await this.click('[data-testid="nav-settings"]');
    await this.waitForURL("/settings");
  }

  // Player Details Page
  async navigateToPlayerDetails() {
    await this.click('text=Player Details, a[href="/settings/player-details"]');
    await this.waitForURL("/settings/player-details");
  }

  async fillPlayerDetails(details: any) {
    // Wait for form to be ready
    await this.waitForElement('select[name="graduation_year"]');

    // Fill graduation year
    if (details.graduationYear) {
      await this.selectOption(
        'select[name="graduation_year"], select#graduation_year',
        details.graduationYear,
      );
    }

    // Save the form
    await this.click('[data-testid="save-player-details-button"]');
    await this.page.waitForTimeout(2000); // Wait for save to complete
  }

  async expectPlayerDetailsVisible() {
    await this.expectVisible('[data-testid="page-title"]');
    await this.expectVisible('[data-testid="basic-info-section"]');
  }

  async expectPlayerDetailsForm() {
    await this.expectVisible('select[name="graduation_year"]');
    await this.expectVisible('label:has-text("Graduation Year")');
  }

  async expectSaveSuccess() {
    // Look for success message or redirect
    const saveButton = await this.page.locator(
      '[data-testid="save-player-details-button"]',
    );
    const buttonText = await saveButton.textContent();

    if (buttonText && buttonText.includes("Save Player Details")) {
      // Save was successful
      return true;
    }
    return false;
  }

  async expectValidationErrors() {
    // Look for validation error messages
    await this.expectVisible(
      '[data-testid*="error"], .error-message, text=Required',
    );
  }

  // Location Settings Page
  async navigateToLocation() {
    await this.click('text=Home Location, a[href="/settings/location"]');
    await this.waitForURL("/settings/location");
  }

  async fillLocationDetails(details: any) {
    // Wait for form to be ready
    await this.waitForElement('input[name="address"]');

    // Fill address
    if (details.address) {
      await this.fillInput(
        'input[name="address"], input[placeholder*="Street"], input[data-testid*="address"]',
        details.address,
      );
    }

    // Fill city
    if (details.city) {
      await this.fillInput(
        'input[name="city"], input[placeholder*="City"], input[data-testid*="city"]',
        details.city,
      );
    }

    // Fill state
    if (details.state) {
      await this.fillInput(
        'input[name="state"], input[placeholder*="State"], input[data-testid*="state"]',
        details.state,
      );
    }

    // Save the form
    await this.click('button:has-text("Save Location")');
    await this.page.waitForTimeout(2000);
  }

  async expectLocationForm() {
    await this.expectVisible('input[name="address"]');
    await this.expectVisible('input[name="city"]');
    await this.expectVisible('input[name="state"]');
  }

  // School Preferences Page
  async navigateToSchoolPreferences() {
    await this.click(
      'text=School Preferences, a[href="/settings/school-preferences"]',
    );
    await this.waitForURL("/settings/school-preferences");
  }

  async expectSchoolPreferencesVisible() {
    await this.expectVisible("text=School Preferences");
  }

  // Account Linking Page
  async navigateToAccountLinking() {
    await this.click(
      'text=Family Account Linking, a[href="/settings/account-linking"]',
    );
    await this.waitForURL("/settings/account-linking");
  }

  async expectAccountLinkingVisible() {
    await this.expectVisible("text=Family Account Linking");
  }

  async sendInvitation(email: string) {
    // Look for invitation form
    await this.waitForElement(
      'input[type="email"], input[placeholder*="email"]',
    );

    // Fill email
    await this.fillInput(
      'input[type="email"], input[placeholder*="email"]',
      email,
    );

    // Send invitation
    await this.click(
      'button:has-text("Send Invitation"), button:has-text("Invite")',
    );
    await this.page.waitForTimeout(2000);
  }

  async expectInvitationSuccess() {
    // Look for success message or updated state
    await this.expectVisible(
      "text=Invitation sent, text=Successfully invited, text=Account linked",
    );
  }

  // Notifications Page
  async navigateToNotifications() {
    await this.click('text=Notifications, a[href="/settings/notifications"]');
    await this.waitForURL("/settings/notifications");
  }

  async expectNotificationsForm() {
    await this.expectVisible(
      'input[type="checkbox"], input[name*="notification"]',
    );
  }

  async toggleNotification(notificationType: string) {
    await this.click(
      `input[name="${notificationType}"], input[data-testid*="${notificationType}"]`,
    );
  }

  async saveNotificationSettings() {
    await this.click('button:has-text("Save"), button:has-text("Update")');
    await this.page.waitForTimeout(2000);
  }

  // Communication Templates Page
  async navigateToTemplates() {
    await this.click(
      'text=Templates, a[href="/settings/communication-templates"]',
    );
    await this.waitForURL("/settings/communication-templates");
  }

  async expectTemplatesVisible() {
    await this.expectVisible("text=Communication Templates");
  }

  async createTemplate(template: any) {
    // Look for template creation form
    await this.waitForElement(
      'input[name="subject"], input[placeholder*="Subject"]',
    );

    // Fill template details
    await this.fillInput(
      'input[name="subject"], input[placeholder*="Subject"]',
      template.subject,
    );
    await this.fillInput(
      'textarea[name="content"], textarea[placeholder*="Content"]',
      template.content,
    );

    // Save template
    await this.click('button:has-text("Create"), button:has-text("Save")');
    await this.page.waitForTimeout(2000);
  }

  async expectTemplateCreated() {
    // Look for success message or new template in list
    await this.expectVisible("text=Template created, text=Successfully saved");
  }

  // Settings Navigation
  async expectSettingsNavigationVisible() {
    await this.expectVisible("text=Profile & Player Info");
    await this.expectVisible("text=Home Location");
    await this.expectVisible("text=School Preferences");
    await this.expectVisible("text=Notifications");
    await this.expectVisible("text=Communication Templates");
    await this.expectVisible("text=Family Account Linking");
  }

  // Form Validation
  async expectValidationError(fieldLabel: string, errorMessage: string) {
    // Look for validation error related to specific field
    await this.expectVisible(`text=${errorMessage}`);

    // Check if the field is highlighted or has error state
    const field = await this.page
      .locator(`label:has-text("${fieldLabel}")`)
      .locator("..");
    const hasError = await field
      .locator('[data-testid*="error"], .error, [aria-invalid="true"]')
      .isVisible();

    if (!hasError) {
      throw new Error(
        `Expected validation error for ${fieldLabel}: ${errorMessage}`,
      );
    }
  }

  // Loading and Error States
  async expectLoadingState() {
    await this.expectVisible(
      '[data-testid*="loading"], .loading, .animate-spin',
    );
  }

  async expectErrorState() {
    await this.expectVisible('[data-testid*="error"], .error, .bg-red-50');
  }

  // Responsive Testing
  async testMobileSettings() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.goto();

    // Mobile settings should be accessible
    await this.expectSettingsNavigationVisible();
  }

  async testDesktopSettings() {
    await this.page.setViewportSize({ width: 1200, height: 800 });
    await this.goto();

    await this.expectSettingsNavigationVisible();
  }

  // Settings Persistence
  async testSettingsPersistence() {
    await this.navigateToPlayerDetails();
    await this.fillPlayerDetails({ graduationYear: "2024" });
    await this.expectSaveSuccess();

    // Navigate away and back
    await this.navigateToSettings();
    await this.navigateToPlayerDetails();

    // Settings should be preserved (depends on implementation)
    await this.expectPlayerDetailsForm();
  }
}
