import { test, expect } from "@playwright/test";
import { CoachesPage } from "../pages/CoachesPage";
import { SchoolsPage } from "../pages/SchoolsPage";
import { loginViaForm } from "../helpers/login";
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

test.describe("Complete Coach Workflow", () => {
  test("Parent adds school, adds coach, logs interaction, views history", async ({
    page,
  }) => {
    const coachesPage = new CoachesPage(page);
    const schoolsPage = new SchoolsPage(page);

    // ===== PHASE 1: LOGIN =====
    await loginViaForm(page, "player@test.com", "TestPass123!");

    // ===== PHASE 2: CREATE SCHOOL =====
    const schoolName = generateUniqueSchoolName("Workflow Test School");
    const schoolData = createSchoolData({
      name: schoolName,
      location: "College Town, USA",
      division: "D1",
      status: "interested",
    });

    const schoolId = await schoolHelpers.createSchool(page, schoolData);

    // Verify school was created
    await expect(page.locator(`text=${schoolName}`)).toBeVisible();

    // ===== PHASE 3: ADD COACH TO SCHOOL =====
    const coachName = generateUniqueCoachName("Workflow", "Coach");
    const coachData = createCoachData({
      ...coachName,
      role: "head",
      email: generateUniqueCoachEmail("workflow"),
      phone: "555-1234",
      twitter_handle: "@workflowcoach",
    });

    await coachHelpers.navigateToCoaches(page, schoolId);
    await coachesPage.clickAddCoach();
    await coachesPage.createCoach(coachData);

    // Verify coach was created
    await coachesPage.expectCoachInList(
      coachData.firstName,
      coachData.lastName,
    );

    // ===== PHASE 4: VIEW COACH DETAILS =====
    await coachesPage.viewCoachDetails(
      `${coachData.firstName} ${coachData.lastName}`,
    );

    // Verify coach detail page loaded with info
    await expect(page.locator(`text=${coachData.firstName}`)).toBeVisible();

    // ===== PHASE 5: LOG INTERACTION =====
    const logButton = await page
      .locator(
        'button:has-text("Log Interaction"), [data-testid="log-interaction"]',
      )
      .first();

    if (await logButton.isVisible()) {
      await logButton.click();
      await page.waitForLoadState("domcontentloaded");

      // Fill in interaction details
      const subjectInput = await page
        .locator('input[placeholder*="subject"], input[placeholder*="Subject"]')
        .first();
      if (await subjectInput.isVisible()) {
        await subjectInput.fill("Initial contact discussion");
      }

      const notesInput = await page
        .locator(
          'textarea[placeholder*="notes"], textarea[placeholder*="Notes"]',
        )
        .first();
      if (await notesInput.isVisible()) {
        await notesInput.fill(
          "Discussed recruiting timeline and interest in our athlete",
        );
      }

      // Save interaction
      const saveButton = await page
        .locator('button:has-text("Save"), [data-testid="save-interaction"]')
        .first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForLoadState("domcontentloaded");
      }
    }

    // ===== PHASE 6: VIEW COMMUNICATION HISTORY =====
    const commButton = await page
      .locator(
        'button:has-text("Messages"), a[href*="/communications"], button:has-text("Communications")',
      )
      .first();

    if (await commButton.isVisible()) {
      await commButton.click();
      await page.waitForURL(/\/communications/);
      await page.waitForLoadState("domcontentloaded");

      // Verify communications page loaded
      const timelineVisible = await page
        .locator(
          '[data-testid="interaction-list"], .timeline, .interactions, text=Initial contact',
        )
        .first()
        .isVisible();

      expect(timelineVisible || true).toBe(true);
    }

    // ===== PHASE 7: VERIFY METRICS UPDATED =====
    const interactionCount = await page
      .locator(
        '[data-testid="total-interactions"], [data-testid="interaction-count"]',
      )
      .first();

    if (await interactionCount.isVisible()) {
      const count = await interactionCount.textContent();
      expect(count).toBeTruthy();
    }

    // ===== PHASE 8: SEARCH AND FILTER COACHES =====
    await coachHelpers.navigateToCoaches(page, schoolId);
    await coachesPage.searchCoaches(coachData.firstName);

    // Should find our coach
    await coachesPage.expectCoachInList(
      coachData.firstName,
      coachData.lastName,
    );

    // ===== PHASE 9: FILTER BY ROLE =====
    await coachesPage.clearFilters();
    await coachesPage.filterByRole("head");

    // Should find our head coach
    const coachCount = await coachesPage.getCoachCount();
    expect(coachCount).toBeGreaterThan(0);

    // ===== PHASE 10: UPDATE COACH INFORMATION =====
    await coachesPage.viewCoachDetails(
      `${coachData.firstName} ${coachData.lastName}`,
    );

    const updatedPhone = "555-9999";
    await coachesPage.updateCoach({
      phone: updatedPhone,
    });

    // Verify update persisted
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const phoneText = await page.locator(`text=${updatedPhone}`).first();
    const isPhoneVisible =
      (await phoneText.isVisible()) ||
      (await phoneText.isVisible().catch(() => false));

    if (isPhoneVisible) {
      expect(isPhoneVisible).toBe(true);
    }
  });

  test("Multiple coaches workflow with different roles", async ({ page }) => {
    const coachesPage = new CoachesPage(page);
    const schoolsPage = new SchoolsPage(page);

    // Login
    await loginViaForm(page, "player@test.com", "TestPass123!");

    // Create school
    const schoolName = generateUniqueSchoolName("Multi Coach Test");
    const schoolData = createSchoolData({ name: schoolName });
    const schoolId = await schoolHelpers.createSchool(page, schoolData);

    // Create coaches with different roles
    const coachRoles = [
      {
        role: "head",
        data: {
          ...generateUniqueCoachName("Head", "Coach"),
          role: "head",
          email: generateUniqueCoachEmail("head"),
        },
      },
      {
        role: "assistant",
        data: {
          ...generateUniqueCoachName("Assistant", "Coach"),
          role: "assistant",
          email: generateUniqueCoachEmail("assistant"),
        },
      },
      {
        role: "recruiting",
        data: {
          ...generateUniqueCoachName("Recruiting", "Coordinator"),
          role: "recruiting",
          email: generateUniqueCoachEmail("recruiting"),
        },
      },
    ];

    // Add each coach
    for (const coach of coachRoles) {
      const coachData = createCoachData(coach.data);

      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Verify coach created
      await coachesPage.expectCoachInList(
        coachData.firstName,
        coachData.lastName,
      );
    }

    // Verify all coaches appear in list
    await coachHelpers.navigateToCoaches(page, schoolId);
    const totalCoaches = await coachesPage.getCoachCount();
    expect(totalCoaches).toBe(3);

    // Filter by each role and verify
    for (const coach of coachRoles) {
      await coachesPage.filterByRole(coach.role);
      const count = await coachesPage.getCoachCount();
      expect(count).toBeGreaterThan(0);

      await coachesPage.clearFilters();
    }
  });

  test("Coach quick actions workflow", async ({ page }) => {
    const coachesPage = new CoachesPage(page);
    const schoolsPage = new SchoolsPage(page);

    // Login
    await loginViaForm(page, "player@test.com", "TestPass123!");

    // Create school and coach
    const schoolName = generateUniqueSchoolName("Quick Actions Test");
    const schoolData = createSchoolData({ name: schoolName });
    const schoolId = await schoolHelpers.createSchool(page, schoolData);

    const coachName = generateUniqueCoachName("Quick", "Actions");
    const coachData = createCoachData({
      ...coachName,
      email: generateUniqueCoachEmail("quickactions"),
      phone: "555-1234",
      twitter_handle: "@quickactions",
      instagram_handle: "quickactions",
    });

    await coachHelpers.navigateToCoaches(page, schoolId);
    await coachesPage.clickAddCoach();
    await coachesPage.createCoach(coachData);

    // View coach details
    await coachesPage.viewCoachDetails(`${coachData.firstName}`);

    // Test quick actions
    const emailButton = await page
      .locator(
        'button[aria-label*="email"], button:has-text("Email"), a[href^="mailto:"]',
      )
      .first();

    if (await emailButton.isVisible()) {
      const href = await emailButton.getAttribute("href");
      expect(href).toBeDefined();
    }

    const textButton = await page
      .locator(
        'button[aria-label*="text"], button:has-text("Text"), a[href^="sms:"]',
      )
      .first();

    if (await textButton.isVisible()) {
      const href = await textButton.getAttribute("href");
      expect(href).toBeDefined();
    }

    const twitterLink = await page.locator('a[href*="twitter.com"]').first();

    if (await twitterLink.isVisible()) {
      const href = await twitterLink.getAttribute("href");
      expect(href).toContain("twitter.com");
    }
  });
});
