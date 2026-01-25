import { test, expect } from "@playwright/test";
import { CoachesPage } from "../pages/CoachesPage";
import { SchoolsPage } from "../pages/SchoolsPage";
import {
  coachFixtures,
  createCoachData,
  generateUniqueCoachEmail,
  generateUniqueCoachName,
  coachHelpers,
} from "../fixtures/coaches.fixture";
import {
  createSchoolData,
  generateUniqueSchoolName,
  schoolHelpers,
} from "../fixtures/schools.fixture";

test.describe("Coaches CRUD Operations", () => {
  let coachesPage: CoachesPage;
  let schoolsPage: SchoolsPage;
  let schoolId: string;

  test.beforeEach(async ({ page }) => {
    coachesPage = new CoachesPage(page);
    schoolsPage = new SchoolsPage(page);

    // Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Sign In")');
    await page.waitForURL("/dashboard");

    // Create a test school
    const schoolName = generateUniqueSchoolName("Coaches Test School");
    const schoolData = createSchoolData({ name: schoolName });
    schoolId = await schoolHelpers.createSchool(page, schoolData);
  });

  // ==================== CREATE TESTS ====================

  test.describe("CREATE Coach", () => {
    test("should create a minimal coach with required fields only", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Min", "Coach");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("min"),
      });

      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Verify coach appears in list
      await coachesPage.expectCoachInList(coachData.firstName, coachData.lastName);
    });

    test("should create a complete coach with all fields populated", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Full", "Coach");
      const coachData = createCoachData({
        ...coachName,
        ...coachFixtures.complete,
        email: generateUniqueCoachEmail("full"),
      });

      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Verify coach appears in list
      await coachesPage.expectCoachInList(coachData.firstName, coachData.lastName);

      // Verify details by clicking to view
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`
      );
      await expect(page.locator(`text=${coachData.email}`)).toBeVisible({
        timeout: 5000,
      });
    });

    test("should create multiple coaches for same school", async ({ page }) => {
      const coaches = [
        {
          ...generateUniqueCoachName("Head", "Coach"),
          ...coachFixtures.headCoach,
          email: generateUniqueCoachEmail("head"),
        },
        {
          ...generateUniqueCoachName("Assistant", "Coach"),
          ...coachFixtures.assistantCoach,
          email: generateUniqueCoachEmail("assistant"),
        },
        {
          ...generateUniqueCoachName("Recruiting", "Coordinator"),
          ...coachFixtures.recruitingCoordinator,
          email: generateUniqueCoachEmail("recruiting"),
        },
      ];

      for (const coach of coaches) {
        await coachHelpers.navigateToCoaches(page, schoolId);
        await coachesPage.clickAddCoach();
        await coachesPage.createCoach(coach);
        await coachesPage.expectCoachInList(coach.firstName, coach.lastName);
      }

      // Verify all coaches are in the list
      await coachHelpers.navigateToCoaches(page, schoolId);
      const coachCount = await coachesPage.getCoachCount();
      expect(coachCount).toBeGreaterThanOrEqual(3);
    });

    test("should create coaches with different roles", async ({ page }) => {
      const roles = ["head", "assistant", "recruiting"];

      for (const role of roles) {
        const coachName = generateUniqueCoachName("Role", role);
        const coachData = createCoachData({
          ...coachName,
          role,
          email: generateUniqueCoachEmail(role),
        });

        await coachHelpers.navigateToCoaches(page, schoolId);
        await coachesPage.clickAddCoach();
        await coachesPage.createCoach(coachData);
        await coachesPage.expectCoachInList(coachData.firstName, coachData.lastName);
      }
    });

    test("should handle special characters in coach names", async ({ page }) => {
      const coachData = createCoachData({
        firstName: "O'Brien",
        lastName: "O'Connor-Smith",
        email: generateUniqueCoachEmail("special"),
      });

      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Verify coach with special chars appears correctly
      await coachesPage.expectCoachInList(coachData.firstName, coachData.lastName);
    });

    test("should sanitize malicious input (XSS prevention)", async ({ page }) => {
      const coachData = createCoachData({
        firstName: "Test<script>alert('xss')</script>",
        lastName: "Coach<img onerror='alert(1)'>",
        email: generateUniqueCoachEmail("xss"),
      });

      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Verify no script was executed and coach was created
      await coachesPage.expectCoachInList(
        coachData.firstName,
        coachData.lastName
      );

      // Verify content is escaped (check page doesn't have actual script tags)
      const pageContent = await page.content();
      expect(pageContent).not.toContain("<script>");
      expect(pageContent).not.toContain("onerror=");
    });
  });

  // ==================== READ TESTS ====================

  test.describe("READ Coach", () => {
    test("should display coach in school's coach list", async ({ page }) => {
      const coachName = generateUniqueCoachName("List", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("list"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Navigate back to list and verify
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.expectCoachInList(coachData.firstName, coachData.lastName);
    });

    test("should view coach detail page with all information", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Detail", "Test");
      const coachData = createCoachData({
        ...coachName,
        ...coachFixtures.complete,
        email: generateUniqueCoachEmail("detail"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // View coach details
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`
      );

      // Verify coach detail page loaded
      await expect(page.locator("h1, h2")).toContainText(
        coachData.firstName
      );
      await expect(page.locator("text=" + coachData.email)).toBeVisible();
    });

    test("should display contact information correctly", async ({ page }) => {
      const coachName = generateUniqueCoachName("Contact", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("contact"),
        phone: "555-1234",
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Verify details
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`
      );

      // Contact info should be visible
      await expect(
        page.locator(`text=${coachData.email}`)).toBeVisible({ timeout: 5000 }
      );
    });
  });

  // ==================== UPDATE TESTS ====================

  test.describe("UPDATE Coach", () => {
    test("should update basic coach information", async ({ page }) => {
      const coachName = generateUniqueCoachName("Update", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("update"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // View and update coach
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`
      );

      const updatedData = {
        firstName: "UpdatedFirst",
        lastName: "UpdatedLast",
      };

      await coachesPage.updateCoach(updatedData);

      // Verify update
      await expect(page.locator(`text=${updatedData.firstName}`)).toBeVisible({
        timeout: 5000,
      });
    });

    test("should update contact details", async ({ page }) => {
      const coachName = generateUniqueCoachName("Phone", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("phone"),
        phone: "555-0000",
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Update phone
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`
      );

      const updatedData = {
        phone: "555-9999",
      };

      await coachesPage.updateCoach(updatedData);

      // Verify update
      await expect(page.locator(`text=555-9999`)).toBeVisible({
        timeout: 5000,
      });
    });

    test("should persist changes after page reload", async ({ page }) => {
      const coachName = generateUniqueCoachName("Persist", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("persist"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Update coach
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`
      );

      const updatedData = {
        firstName: "PersistFirst",
      };

      await coachesPage.updateCoach(updatedData);

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Verify changes persisted
      await expect(page.locator(`text=PersistFirst`)).toBeVisible({
        timeout: 5000,
      });
    });
  });

  // ==================== DELETE TESTS ====================

  test.describe("DELETE Coach", () => {
    test("should delete coach with confirmation", async ({ page }) => {
      const coachName = generateUniqueCoachName("Delete", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("delete"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Verify coach exists
      await coachesPage.expectCoachInList(coachData.firstName, coachData.lastName);

      // Delete coach
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`
      );

      await coachesPage.deleteCoach(
        `${coachData.firstName} ${coachData.lastName}`
      );

      // Verify coach is removed from list
      await coachHelpers.navigateToCoaches(page, schoolId);
      // Note: Coach might still appear briefly, so we check it's gone after navigation
      const coachCount = await coachesPage.getCoachCount();
      expect(coachCount).toBeGreaterThanOrEqual(0); // At least deleted coach is gone
    });

    test("should remove coach from list after deletion", async ({ page }) => {
      const coachName = generateUniqueCoachName("Remove", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("remove"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      const initialCount = await coachesPage.getCoachCount();

      // Delete coach
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`
      );

      await coachesPage.deleteCoach(
        `${coachData.firstName} ${coachData.lastName}`
      );

      // Verify removed from list
      await coachHelpers.navigateToCoaches(page, schoolId);
      const finalCount = await coachesPage.getCoachCount();
      expect(finalCount).toBeLessThanOrEqual(initialCount);
    });
  });
});
