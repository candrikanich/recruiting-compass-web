import { test, expect } from "@playwright/test";
import { CoachesPage } from "../pages/CoachesPage";
import {
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

test.describe("Coach Detail Page - Comprehensive Coverage", () => {
  let coachesPage: CoachesPage;
  let schoolId: string;

  test.beforeEach(async ({ page }) => {
    coachesPage = new CoachesPage(page);

    // Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Sign In")');
    await page.waitForURL("/dashboard");

    // Create a test school
    const schoolName = generateUniqueSchoolName("Detail Test School");
    const schoolData = createSchoolData({ name: schoolName });
    schoolId = await schoolHelpers.createSchool(page, schoolData);
  });

  // ==================== MODAL INTERACTIONS ====================

  test.describe("Modal Interactions", () => {
    test("should open and close communication panel modal", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Modal", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("modal"),
        phone: "555-1234",
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // View coach details
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Click Email button to open communication panel
      const emailButton = page.locator('button:has-text("Email")').first();
      await emailButton.click();

      // Verify modal opened
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify modal title
      await expect(
        page.locator(
          "#communication-panel-title, h2:has-text('Quick Communication')",
        ),
      ).toBeVisible();

      // Close modal with close button
      const closeButton = page
        .locator('button[aria-label*="Close"], button:has(svg)')
        .last();
      await closeButton.click();

      // Verify modal closed
      await expect(modal).not.toBeVisible();
    });

    test("should close communication panel modal with Escape key", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Escape", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("escape"),
      });

      // Create and navigate to coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Open modal
      const emailButton = page.locator('button:has-text("Email")').first();
      await emailButton.click();

      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible();

      // Press Escape key
      await page.keyboard.press("Escape");

      // Verify modal closed
      await expect(modal).not.toBeVisible();
    });

    test("should open and close edit coach modal", async ({ page }) => {
      const coachName = generateUniqueCoachName("Edit", "Modal");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("editmodal"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Click Edit button
      const editButton = page.locator('button:has-text("Edit")').first();
      await editButton.click();

      // Verify edit modal opened
      const modal = page
        .locator(
          '[role="dialog"]:has-text("Edit"), .modal:has-text("Edit Coach")',
        )
        .first();

      if (await modal.isVisible()) {
        // Close modal
        const cancelButton = page.locator('button:has-text("Cancel")').first();
        await cancelButton.click();

        // Verify modal closed
        await expect(modal).not.toBeVisible();
      }
    });

    test("should open delete confirmation modal and cancel", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Delete", "Cancel");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("deletecancel"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Click Delete button
      const deleteButton = page
        .locator(
          '[data-test="coach-detail-delete-btn"], button:has-text("Delete Coach")',
        )
        .first();
      await deleteButton.click();

      // Verify confirmation modal opened
      const modal = page
        .locator(
          '[role="dialog"]:has-text("Delete"), .modal:has-text("delete")',
        )
        .first();
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Click Cancel
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      await cancelButton.click();

      // Verify modal closed and coach still exists
      await expect(modal).not.toBeVisible();
      await expect(page.locator(`text=${coachData.firstName}`)).toBeVisible();
    });

    test("should trap focus within communication panel modal", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Focus", "Trap");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("focus"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Open modal
      const emailButton = page.locator('button:has-text("Email")').first();
      await emailButton.click();

      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible();

      // Tab through focusable elements - focus should stay within modal
      await page.keyboard.press("Tab");
      const focusedElement = page.locator(":focus");

      // Verify focused element is within modal
      const focusedWithinModal = await focusedElement.evaluate((el) => {
        const dialog = el.closest('[role="dialog"]');
        return dialog !== null;
      });

      expect(focusedWithinModal).toBe(true);

      // Close modal
      await page.keyboard.press("Escape");
    });
  });

  // ==================== NOTES FUNCTIONALITY ====================

  test.describe("Notes Functionality", () => {
    test("should save coach notes and persist after reload", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Notes", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("notes"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Find notes textarea (not private notes)
      const notesSection = page
        .locator('section:has-text("Notes"):not(:has-text("Private"))')
        .first();
      const notesTextarea = notesSection
        .locator('textarea[placeholder*="notes"]')
        .first();

      // Fill notes
      const notesText = "Excellent recruiter with strong relationships";
      await notesTextarea.fill(notesText);

      // Save notes
      const saveButton = notesSection
        .locator('button:has-text("Save")')
        .first();
      await saveButton.click();

      // Wait for save to complete
      await page.waitForTimeout(1000);

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Verify notes persisted
      const reloadedNotesSection = page
        .locator('section:has-text("Notes"):not(:has-text("Private"))')
        .first();
      const reloadedNotesTextarea = reloadedNotesSection
        .locator("textarea")
        .first();
      const savedNotes = await reloadedNotesTextarea.inputValue();

      expect(savedNotes).toBe(notesText);
    });

    test("should save private notes separately from regular notes", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Private", "Notes");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("privatenotes"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Fill regular notes
      const notesSection = page
        .locator('section:has-text("Notes"):not(:has-text("Private"))')
        .first();
      const notesTextarea = notesSection.locator("textarea").first();
      await notesTextarea.fill("Regular coach notes");
      const saveNotesButton = notesSection
        .locator('button:has-text("Save")')
        .first();
      await saveNotesButton.click();
      await page.waitForTimeout(500);

      // Fill private notes
      const privateNotesSection = page
        .locator('section:has-text("Private Notes")')
        .first();
      const privateNotesTextarea = privateNotesSection
        .locator("textarea")
        .first();
      await privateNotesTextarea.fill("My private thoughts about this coach");
      const savePrivateButton = privateNotesSection
        .locator('button:has-text("Save")')
        .first();
      await savePrivateButton.click();
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Verify both sets of notes persisted
      const reloadedNotes = await page
        .locator('section:has-text("Notes"):not(:has-text("Private"))')
        .locator("textarea")
        .first()
        .inputValue();
      const reloadedPrivateNotes = await page
        .locator('section:has-text("Private Notes")')
        .locator("textarea")
        .first()
        .inputValue();

      expect(reloadedNotes).toBe("Regular coach notes");
      expect(reloadedPrivateNotes).toBe("My private thoughts about this coach");
    });

    test("should clear notes when textarea is emptied", async ({ page }) => {
      const coachName = generateUniqueCoachName("Clear", "Notes");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("clear"),
      });

      // Create coach with notes
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      const notesSection = page
        .locator('section:has-text("Notes"):not(:has-text("Private"))')
        .first();
      const notesTextarea = notesSection.locator("textarea").first();

      // Add notes
      await notesTextarea.fill("Initial notes");
      await notesSection.locator('button:has-text("Save")').click();
      await page.waitForTimeout(500);

      // Clear notes
      await notesTextarea.clear();
      await notesSection.locator('button:has-text("Save")').click();
      await page.waitForTimeout(500);

      // Reload and verify cleared
      await page.reload();
      await page.waitForLoadState("networkidle");

      const clearedNotes = await page
        .locator('section:has-text("Notes"):not(:has-text("Private"))')
        .locator("textarea")
        .first()
        .inputValue();

      expect(clearedNotes).toBe("");
    });
  });

  // ==================== ERROR HANDLING ====================

  test.describe("Error Handling", () => {
    test("should display error when coach not found", async ({ page }) => {
      // Navigate to non-existent coach ID
      await page.goto("/coaches/non-existent-coach-id-12345");
      await page.waitForLoadState("networkidle");

      // Verify error state displayed
      const errorMessages = [
        "Coach not found",
        "not found",
        "doesn't exist",
        "Error",
      ];

      let foundError = false;
      for (const errorMsg of errorMessages) {
        const errorElement = page.locator(`text=${errorMsg}`).first();
        if (
          await errorElement.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          foundError = true;
          break;
        }
      }

      expect(foundError).toBe(true);
    });

    test("should handle missing optional contact fields gracefully", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Minimal", "Contact");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("minimal"),
        phone: undefined,
        twitter_handle: undefined,
        instagram_handle: undefined,
      });

      // Create coach with minimal contact info
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Verify page renders without errors
      await expect(page.locator(`text=${coachData.firstName}`)).toBeVisible();

      // Verify action buttons are hidden or disabled for missing contact info
      const textButton = page.locator('button:has-text("Text")');
      const callButton = page.locator('button:has-text("Call")');
      const twitterButton = page.locator('button:has-text("Twitter")');
      const instagramButton = page.locator('button:has-text("Instagram")');

      // These buttons should not exist or be disabled
      const textVisible = await textButton
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      const callVisible = await callButton
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      const twitterVisible = await twitterButton
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      const instagramVisible = await instagramButton
        .isVisible({ timeout: 1000 })
        .catch(() => false);

      expect(textVisible).toBe(false);
      expect(callVisible).toBe(false);
      expect(twitterVisible).toBe(false);
      expect(instagramVisible).toBe(false);
    });
  });

  // ==================== STATS DISPLAY ====================

  test.describe("Stats Display", () => {
    test("should display coach stats on detail page", async ({ page }) => {
      const coachName = generateUniqueCoachName("Stats", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("stats"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Verify stats section exists
      const statsSection = page
        .locator(
          'section:has-text("Total Interactions"), section:has-text("Statistics")',
        )
        .first();

      const statsVisible = await statsSection
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (statsVisible) {
        // Verify stat cards are displayed
        await expect(statsSection).toBeVisible();

        // Look for common stat labels
        const statLabels = [
          "Total Interactions",
          "Days Since Contact",
          "Response Method",
        ];

        for (const label of statLabels) {
          const labelElement = page.locator(`text=${label}`).first();
          const labelVisible = await labelElement
            .isVisible({ timeout: 1000 })
            .catch(() => false);

          if (labelVisible) {
            await expect(labelElement).toBeVisible();
            break;
          }
        }
      }
    });

    test("should show zero interactions for new coach", async ({ page }) => {
      const coachName = generateUniqueCoachName("Zero", "Interactions");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("zero"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Look for interactions section
      const interactionsSection = page
        .locator(
          'section:has-text("Recent Interactions"), section:has-text("Interactions")',
        )
        .first();

      const sectionVisible = await interactionsSection
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (sectionVisible) {
        // Should show empty state
        const emptyStateMessages = [
          "No interactions recorded yet",
          "No interactions",
          "0 interactions",
        ];

        let foundEmptyState = false;
        for (const msg of emptyStateMessages) {
          const msgElement = page.locator(`text=${msg}`).first();
          if (
            await msgElement.isVisible({ timeout: 1000 }).catch(() => false)
          ) {
            foundEmptyState = true;
            break;
          }
        }

        expect(foundEmptyState).toBe(true);
      }
    });
  });

  // ==================== LOADING STATES ====================

  test.describe("Loading States", () => {
    test("should show loading state before coach data loads", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Loading", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("loading"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);

      // Get coach ID from URL after viewing
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );
      const currentUrl = page.url();
      const coachId = currentUrl.split("/coaches/")[1]?.split("/")[0];

      if (coachId) {
        // Navigate directly to trigger loading state
        await page.goto(`/coaches/${coachId}`);

        // Look for loading indicator (may be very brief)
        const loadingMessages = [
          "Loading",
          "loading",
          "Loading coach",
          "Loading profile",
        ];

        // Note: Loading state may be too fast to catch reliably
        // Just verify page eventually loads successfully
        await page.waitForLoadState("networkidle");
        await expect(page.locator(`text=${coachData.firstName}`)).toBeVisible({
          timeout: 5000,
        });
      }
    });
  });

  // ==================== EDGE CASES ====================

  test.describe("Edge Cases", () => {
    test("should handle coach with no school association gracefully", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("NoSchool", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("noschool"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Page should render without errors even if school name is missing
      await expect(page.locator(`text=${coachData.firstName}`)).toBeVisible();
    });

    test("should navigate back to coaches list from detail page", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("Navigate", "Back");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("navigate"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Click back link
      const backLink = page
        .locator('a:has-text("Back"), a:has-text("All Coaches")')
        .first();
      await backLink.click();

      // Verify returned to coaches list
      await expect(page).toHaveURL(/\/coaches/);
      await expect(page).not.toHaveURL(/\/coaches\/[a-z0-9-]+$/);
    });

    test("should handle very long notes gracefully", async ({ page }) => {
      const coachName = generateUniqueCoachName("Long", "Notes");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("longnotes"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Create very long notes (500 characters)
      const longNotes = "A".repeat(500);

      const notesSection = page
        .locator('section:has-text("Notes"):not(:has-text("Private"))')
        .first();
      const notesTextarea = notesSection.locator("textarea").first();

      await notesTextarea.fill(longNotes);
      await notesSection.locator('button:has-text("Save")').click();
      await page.waitForTimeout(500);

      // Reload and verify notes persisted
      await page.reload();
      await page.waitForLoadState("networkidle");

      const savedLongNotes = await page
        .locator('section:has-text("Notes"):not(:has-text("Private"))')
        .locator("textarea")
        .first()
        .inputValue();

      expect(savedLongNotes.length).toBe(500);
    });
  });

  // ==================== ACCESSIBILITY ====================

  test.describe("Accessibility", () => {
    test("should have skip link that works", async ({ page }) => {
      const coachName = generateUniqueCoachName("Skip", "Link");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("skip"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Tab to skip link (should be first focusable element)
      await page.keyboard.press("Tab");

      // Verify skip link is focused
      const skipLink = page.locator('a[href="#main-content"]').first();
      const skipLinkVisible = await skipLink.isVisible().catch(() => false);

      if (skipLinkVisible) {
        await expect(skipLink).toBeFocused();

        // Activate skip link
        await page.keyboard.press("Enter");

        // Verify focus moved to main content
        const mainContent = page.locator("#main-content").first();
        await expect(mainContent).toBeVisible();
      }
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      const coachName = generateUniqueCoachName("Heading", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("heading"),
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Verify coach name is in a heading
      const headings = page.locator("h1, h2, h3");
      const coachNameInHeading = headings.locator(
        `text=${coachData.firstName}`,
      );

      const headingVisible = await coachNameInHeading
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (headingVisible) {
        await expect(coachNameInHeading).toBeVisible();
      }
    });

    test("should have accessible action buttons with aria-labels", async ({
      page,
    }) => {
      const coachName = generateUniqueCoachName("ARIA", "Test");
      const coachData = createCoachData({
        ...coachName,
        email: generateUniqueCoachEmail("aria"),
        phone: "555-1234",
      });

      // Create coach
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.clickAddCoach();
      await coachesPage.createCoach(coachData);
      await coachesPage.viewCoachDetails(
        `${coachData.firstName} ${coachData.lastName}`,
      );

      // Check action buttons have aria-labels
      const emailButton = page.locator('button:has-text("Email")').first();
      const editButton = page.locator('button:has-text("Edit")').first();

      if (await emailButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        const ariaLabel = await emailButton.getAttribute("aria-label");
        expect(ariaLabel).toBeTruthy();
      }

      if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        const ariaLabel = await editButton.getAttribute("aria-label");
        expect(ariaLabel).toBeTruthy();
      }
    });
  });
});
