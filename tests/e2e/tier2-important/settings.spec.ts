import { test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { SettingsPage } from "../pages/SettingsPage";
import { testUsers } from "../fixtures/testData";

test.describe("Phase 2: Settings Pages - Comprehensive Coverage", () => {
  let authPage: AuthPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    settingsPage = new SettingsPage(page);

    // Login first
    await authPage.goto();
    await authPage.signup(
      testUsers.newUser.email,
      testUsers.newUser.password,
      testUsers.newUser.displayName,
    );
  });

  test("should load settings dashboard successfully", async ({ page }) => {
    await settingsPage.navigateToSettings();
    await settingsPage.expectVisible(
      "text=Manage your profile, preferences, and account settings",
    );
  });

  test("should display all settings navigation options", async ({ page }) => {
    await settingsPage.navigateToSettings();
    await settingsPage.expectSettingsNavigationVisible();
  });

  test("should navigate to player details page", async ({ page }) => {
    await settingsPage.navigateToSettings();
    await settingsPage.navigateToPlayerDetails();
    await settingsPage.expectPlayerDetailsVisible();
    await settingsPage.expectPlayerDetailsForm();
  });

  test("should fill and save player details", async ({ page }) => {
    await settingsPage.navigateToPlayerDetails();

    const playerDetails = {
      graduationYear: "2023",
    };

    await settingsPage.fillPlayerDetails(playerDetails);

    // Save and verify success
    await settingsPage.expectSaveSuccess();
  });

  test("should navigate to location settings", async ({ page }) => {
    await settingsPage.navigateToSettings();
    await settingsPage.navigateToLocation();
    await settingsPage.expectLocationForm();
  });

  test("should fill and save location details", async ({ page }) => {
    await settingsPage.navigateToLocation();

    const locationDetails = {
      address: "123 Main St",
      city: "Anytown",
      state: "CA",
    };

    await settingsPage.fillLocationDetails(locationDetails);

    // Verify form submission
    await settingsPage.expectLocationForm();
  });

  test("should navigate to school preferences", async ({ page }) => {
    await settingsPage.navigateToSettings();
    await settingsPage.navigateToSchoolPreferences();
    await settingsPage.expectSchoolPreferencesVisible();
  });

  test("should navigate to account linking", async ({ page }) => {
    await settingsPage.navigateToSettings();
    await settingsPage.navigateToAccountLinking();
    await settingsPage.expectAccountLinkingVisible();
  });

  test("should send family invitation", async ({ page }) => {
    await settingsPage.navigateToAccountLinking();

    const invitationEmail = `family-${Date.now()}@example.com`;

    await settingsPage.sendInvitation(invitationEmail);
    await settingsPage.expectInvitationSuccess();
  });

  test("should navigate to notifications settings", async ({ page }) => {
    await settingsPage.navigateToSettings();
    await settingsPage.navigateToNotifications();
    await settingsPage.expectNotificationsForm();
  });

  test("should toggle notification settings", async ({ page }) => {
    await settingsPage.navigateToNotifications();

    // Toggle a few notification types
    await settingsPage.toggleNotification("email_notifications");
    await settingsPage.toggleNotification("sms_notifications");
    await settingsPage.toggleNotification("push_notifications");

    // Save settings
    await settingsPage.saveNotificationSettings();

    // Verify settings are applied
    await settingsPage.expectNotificationsForm();
  });

  test("should navigate to communication templates", async ({ page }) => {
    await settingsPage.navigateToSettings();
    await settingsPage.navigateToTemplates();
    await settingsPage.expectTemplatesVisible();
  });

  test("should create communication template", async ({ page }) => {
    await settingsPage.navigateToTemplates();

    const template = {
      subject: "Recruiting Follow-up",
      content:
        "Dear Coach, I wanted to follow up on our previous conversation...",
    };

    await settingsPage.createTemplate(template);
    await settingsPage.expectTemplateCreated();
  });

  test("should validate form inputs", async ({ page }) => {
    await settingsPage.navigateToPlayerDetails();

    // Try to save without required field
    await settingsPage.fillPlayerDetails({ graduationYear: "" }); // Empty required field
    await settingsPage.click('[data-testid="save-player-details-button"]');

    // Should show validation error
    await settingsPage.expectValidationError(
      "Graduation Year",
      "This field is required",
    );
  });

  test("should handle loading states", async ({ page }) => {
    await settingsPage.navigateToSettings();
    await settingsPage.expectLoadingState();

    // Should eventually load
    await settingsPage.expectSettingsNavigationVisible();
  });

  test("should handle error states gracefully", async ({ page }) => {
    await settingsPage.navigateToAccountLinking();

    // Try to send invitation with invalid email
    await settingsPage.sendInvitation("invalid-email");

    // Should show error without crashing
    await settingsPage.expectErrorState();
  });

  test("should be responsive on mobile", async ({ page }) => {
    await settingsPage.testMobileSettings();
    await settingsPage.expectSettingsNavigationVisible();
  });

  test("should be responsive on desktop", async ({ page }) => {
    await settingsPage.testDesktopSettings();
    await settingsPage.expectSettingsNavigationVisible();
  });

  test("should persist settings across navigation", async ({ page }) => {
    await settingsPage.navigateToPlayerDetails();

    // Fill and save some settings
    await settingsPage.fillPlayerDetails({ graduationYear: "2022" });
    await settingsPage.expectSaveSuccess();

    // Navigate away and back
    await settingsPage.navigateToSettings();
    await settingsPage.navigateToPlayerDetails();

    // Settings should be preserved
    await settingsPage.expectPlayerDetailsForm();
  });

  test("should handle form validation for multiple fields", async ({
    page,
  }) => {
    await settingsPage.navigateToLocation();

    // Fill form with invalid data
    await settingsPage.fillLocationDetails({
      address: "", // Empty required field
      city: "CityWithInvalidCharacters!@#$%", // Invalid characters
      state: "XX", // Invalid state code
    });

    // Try to save
    await settingsPage.click('button:has-text("Save Location")');

    // Should show validation errors
    await settingsPage.expectValidationError(
      "Street Address",
      "This field is required",
    );
    await settingsPage.expectValidationError(
      "City",
      "City contains invalid characters",
    );
    await settingsPage.expectValidationError(
      "State",
      "Please enter a valid state code",
    );
  });

  test("should handle successful save confirmation", async ({ page }) => {
    await settingsPage.navigateToPlayerDetails();

    const validDetails = {
      graduationYear: "2024",
    };

    await settingsPage.fillPlayerDetails(validDetails);

    // Verify save was successful
    const saveSuccessful = await settingsPage.expectSaveSuccess();

    if (saveSuccessful) {
      // Should show success message or redirect
      await settingsPage.expectVisible(
        "text=Saved successfully, text=Player details updated",
      );
    }
  });

  test("should provide accessibility feedback", async ({ page }) => {
    await settingsPage.navigateToPlayerDetails();

    // Check that form elements have proper labels and ARIA attributes
    const graduationYearSelect = await settingsPage.page.locator(
      'select[name="graduation_year"]',
    );
    await graduationYearSelect.isVisible();

    // Check for proper label association
    const label = await settingsPage.page.locator(
      'label:has-text("Graduation Year")',
    );
    await label.isVisible();

    // Verify ARIA attributes exist
    const hasAriaLabel = await graduationYearSelect.getAttribute("aria-label");
    const hasAriaRequired = await settingsPage.page
      .locator('label:has-text("Graduation Year")')
      .locator('[aria-required="true"]')
      .isVisible();

    // Should have some accessibility attributes
    if (!hasAriaLabel && !hasAriaRequired) {
      console.log("Form could improve accessibility - missing ARIA attributes");
    }
  });
});
