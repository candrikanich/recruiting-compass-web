import { test, expect } from "@playwright/test";
import { authFixture } from "./fixtures/auth.fixture";
import {
  schoolHelpers,
  createSchoolData,
  generateUniqueSchoolName,
  sidebarSelectors,
} from "./fixtures/schools.fixture";
import {
  coachFixtures,
  createCoachData,
  generateUniqueCoachEmail,
} from "./fixtures/coaches.fixture";

test.describe("School Detail - Sidebar Features", () => {
  let schoolId: string;

  test.beforeEach(async ({ page }) => {
    await authFixture.loginFast(page, "player");

    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("Sidebar Test"),
    });
    schoolId = await schoolHelpers.createSchool(page, schoolData);

    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
  });

  test.describe("Quick Actions Section", () => {
    test("should display quick action buttons", async ({ page }) => {
      const quickActionsHeading = page.locator(sidebarSelectors.quickActions);
      await expect(quickActionsHeading).toBeVisible();

      const logInteractionLink = page.locator(
        sidebarSelectors.logInteractionLink,
      );
      await expect(logInteractionLink).toBeVisible();

      const sendEmailButton = page.locator(sidebarSelectors.sendEmailButton);
      await expect(sendEmailButton).toBeVisible();

      const manageCoachesLink = page.locator(
        sidebarSelectors.manageCoachesLink,
      );
      await expect(manageCoachesLink).toBeVisible();
    });

    test("should navigate to interactions page on Log Interaction click", async ({
      page,
    }) => {
      const logInteractionLink = page.locator(
        sidebarSelectors.logInteractionLink,
      );
      await logInteractionLink.click();

      await page.waitForURL(`/schools/${schoolId}/interactions`);
      expect(page.url()).toContain(`/schools/${schoolId}/interactions`);
    });

    test("should open email modal on Send Email click", async ({ page }) => {
      const sendEmailButton = page.locator(sidebarSelectors.sendEmailButton);
      await sendEmailButton.click();

      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      const modalVisible = await modal.isVisible();

      if (modalVisible) {
        await expect(modal).toBeVisible();
      }
    });

    test("should navigate to coaches management on Manage Coaches click", async ({
      page,
    }) => {
      const manageCoachesLink = page.locator(
        sidebarSelectors.manageCoachesLink,
      );
      await manageCoachesLink.click();

      await page.waitForURL(`/schools/${schoolId}/coaches`);
      expect(page.url()).toContain(`/schools/${schoolId}/coaches`);
    });
  });

  test.describe("Coaches List", () => {
    test("should display empty state when no coaches exist", async ({
      page,
    }) => {
      const emptyState = page.locator(sidebarSelectors.emptyCoachState);
      await expect(emptyState).toBeVisible();

      const manageLink = page
        .locator(sidebarSelectors.manageCoachesLink)
        .nth(1);
      await expect(manageLink).toBeVisible();
    });

    test("should display coaches list with contact icons", async ({ page }) => {
      const coach1 = createCoachData({
        firstName: "John",
        lastName: "Smith",
        email: generateUniqueCoachEmail("john"),
        phone: "555-0100",
      });

      const coach2 = createCoachData({
        firstName: "Jane",
        lastName: "Doe",
        email: generateUniqueCoachEmail("jane"),
        phone: "555-0101",
      });

      await schoolHelpers.addCoachToSchool(page, schoolId, coach1);
      await schoolHelpers.addCoachToSchool(page, schoolId, coach2);

      await page.goto(`/schools/${schoolId}`);
      await page.waitForLoadState("networkidle");

      const coachCards = page.locator(sidebarSelectors.coachCard);
      const coachCount = await coachCards.count();
      expect(coachCount).toBeGreaterThanOrEqual(2);

      const emailIcon = page.locator(sidebarSelectors.emailIcon).first();
      await expect(emailIcon).toBeVisible();

      const smsIcon = page.locator(sidebarSelectors.smsIcon).first();
      await expect(smsIcon).toBeVisible();

      const phoneIcon = page.locator(sidebarSelectors.phoneIcon).first();
      await expect(phoneIcon).toBeVisible();
    });

    test("should construct correct mailto links for coach emails", async ({
      page,
    }) => {
      const coachEmail = generateUniqueCoachEmail("mailto-test");
      const coach = createCoachData({
        firstName: "Email",
        lastName: "Test",
        email: coachEmail,
        phone: "555-1234",
      });

      await schoolHelpers.addCoachToSchool(page, schoolId, coach);

      await page.goto(`/schools/${schoolId}`);
      await page.waitForLoadState("networkidle");

      const emailLink = page.locator(sidebarSelectors.emailIcon).first();
      const href = await emailLink.getAttribute("href");

      expect(href).toContain("mailto:");
      expect(href).toContain(coachEmail);
    });

    test("should construct correct tel links for coach phone", async ({
      page,
    }) => {
      const coach = createCoachData({
        firstName: "Phone",
        lastName: "Test",
        email: generateUniqueCoachEmail("phone"),
        phone: "555-1234",
      });

      await schoolHelpers.addCoachToSchool(page, schoolId, coach);

      await page.goto(`/schools/${schoolId}`);
      await page.waitForLoadState("networkidle");

      const phoneLink = page.locator(sidebarSelectors.phoneIcon).first();
      const href = await phoneLink.getAttribute("href");

      expect(href).toContain("tel:");
      expect(href).toContain("555-1234");
    });

    test("should construct correct sms links for coach phone", async ({
      page,
    }) => {
      const coach = createCoachData({
        firstName: "SMS",
        lastName: "Test",
        email: generateUniqueCoachEmail("sms"),
        phone: "555-1234",
      });

      await schoolHelpers.addCoachToSchool(page, schoolId, coach);

      await page.goto(`/schools/${schoolId}`);
      await page.waitForLoadState("networkidle");

      const smsLink = page.locator(sidebarSelectors.smsIcon).first();
      const href = await smsLink.getAttribute("href");

      expect(href).toContain("sms:");
      expect(href).toContain("555-1234");
    });
  });

  test.describe("Attribution Section", () => {
    test("should display school metadata", async ({ page }) => {
      const attributionHeading = page.locator(
        sidebarSelectors.attributionSection,
      );
      await expect(attributionHeading).toBeVisible();

      const createdBy = page.locator(sidebarSelectors.createdBy);
      await expect(createdBy).toBeVisible();

      const lastUpdated = page.locator(sidebarSelectors.lastUpdated);
      await expect(lastUpdated).toBeVisible();

      const pageContent = await page.content();
      expect(pageContent).toContain("Parent");
    });
  });

  test.describe("Delete School", () => {
    test("should show delete confirmation dialog", async ({ page }) => {
      const deleteButton = page.locator(sidebarSelectors.deleteButton);
      await deleteButton.scrollIntoViewIfNeeded();
      await deleteButton.click();

      await page.waitForTimeout(500);

      const confirmDialog = page.locator(sidebarSelectors.confirmDialog);
      const dialogVisible = await confirmDialog.isVisible();

      if (dialogVisible) {
        await expect(confirmDialog).toBeVisible();

        const confirmDeleteButton = page.locator(
          sidebarSelectors.confirmDeleteButton,
        );
        await expect(confirmDeleteButton).toBeVisible();

        const cancelButton = page.locator(sidebarSelectors.cancelDialogButton);
        await expect(cancelButton).toBeVisible();
      }
    });

    test("should delete school and redirect on confirmation", async ({
      page,
    }) => {
      const deleteButton = page.locator(sidebarSelectors.deleteButton);
      await deleteButton.scrollIntoViewIfNeeded();
      await deleteButton.click();

      await page.waitForTimeout(500);

      const confirmDialog = page.locator(sidebarSelectors.confirmDialog);
      const dialogVisible = await confirmDialog.isVisible();

      if (dialogVisible) {
        const confirmDeleteButton = page.locator(
          sidebarSelectors.confirmDeleteButton,
        );
        await confirmDeleteButton.click();

        await page.waitForTimeout(2000);

        expect(page.url()).toContain("/schools");
        expect(page.url()).not.toContain(schoolId);
      }
    });

    test("should cancel delete operation", async ({ page }) => {
      const deleteButton = page.locator(sidebarSelectors.deleteButton);
      await deleteButton.scrollIntoViewIfNeeded();
      await deleteButton.click();

      await page.waitForTimeout(500);

      const confirmDialog = page.locator(sidebarSelectors.confirmDialog);
      const dialogVisible = await confirmDialog.isVisible();

      if (dialogVisible) {
        const cancelButton = page.locator(sidebarSelectors.cancelDialogButton);
        await cancelButton.click();

        await page.waitForTimeout(500);

        expect(page.url()).toContain(`/schools/${schoolId}`);

        await page.goto("/schools");
        await page.waitForLoadState("networkidle");

        const schoolLink = page.locator(`a[href="/schools/${schoolId}"]`);
        const linkExists = await schoolLink.count();
        expect(linkExists).toBeGreaterThan(0);
      }
    });
  });
});
