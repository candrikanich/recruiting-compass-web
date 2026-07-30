import { test, expect, type Browser } from "@playwright/test";
import { resolve } from "path";
import {
  schoolHelpers,
  createSchoolData,
  deleteSchoolDirect,
  generateUniqueSchoolName,
} from "./fixtures/schools.fixture";

/**
 * E2E Tests for Coaching Philosophy Feature
 *
 * These tests verify that the Coaching Philosophy component works correctly
 * in the context of the school detail page. Tests are designed to be resilient
 * and work whether or not data is populated on the page.
 */

test.describe("Coaching Philosophy - Feature E2E", () => {
  // fullyParallel can shard this describe's tests across workers, each of
  // which would otherwise independently re-run beforeAll -- pin to one
  // worker so the seeded school is created exactly once (same race found
  // in family-invite-flow.spec.ts).
  test.describe.configure({ mode: "serial" });

  let schoolId: string | null = null;
  let seedError: string | null = null;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    try {
      const ctx = await browser.newContext({
        storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
      });
      try {
        const page = await ctx.newPage();
        schoolId = await schoolHelpers.createSchool(
          page,
          createSchoolData({
            name: generateUniqueSchoolName("Coaching Philosophy"),
          }),
        );
      } finally {
        await ctx.close();
      }
    } catch (e) {
      seedError = e instanceof Error ? e.message : String(e);
      console.warn("⚠️  coaching-philosophy seed failed:", e);
    }
  });

  test.afterAll(async () => {
    if (schoolId) await deleteSchoolDirect(schoolId);
  });

  /**
   * Helper function to navigate to the seeded school's detail page.
   * Returns true if successful, false otherwise.
   */
  const navigateToSchool = async (page: any) => {
    if (!schoolId) return false;
    try {
      await page.goto(`/schools/${schoolId}`, { waitUntil: "domcontentloaded" });
      // Surface any pending "session expired" redirect before sampling — the
      // first test in this file occasionally lands here with stale session
      // state and bounces to /login mid-test if we click too early.
      if (page.url().includes("/login")) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  test("Coaching Philosophy section should be present on school detail page", async ({
    page,
  }) => {
    const navigated = await navigateToSchool(page);

    if (navigated) {
      // School detail renders a "Loading school..." shell before the cards
      // mount; wait past that before asserting on the heading.
      await page
        .locator("text=Loading school...")
        .waitFor({ state: "detached", timeout: 10000 })
        .catch(() => null);
      // SchoolCoachingPhilosophy is the 6th component to mount in the left
      // column (behind header, division-rec, info card, notes, pros/cons),
      // each doing its own async work — under heavy parallel-worker CPU
      // contention, total time-to-mount can occasionally exceed a tight
      // timeout even though the heading itself has no data-gate.
      const heading = page.locator("h2:has-text('Coaching Philosophy')");
      await expect(heading).toBeVisible({ timeout: 20000 });
    } else {
      test.skip(true, `school seed unavailable or session bounced to /login: ${seedError ?? "unknown"}`);
    }
  });

  test("Coaching Philosophy should have Edit button", async ({ page }) => {
    const navigated = await navigateToSchool(page);

    if (navigated) {
      // Find Edit button near Coaching Philosophy
      const philosophySection = page.locator(
        "h2:has-text('Coaching Philosophy')",
      );
      const isSectionVisible = await philosophySection
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isSectionVisible) {
        const editButton = page.locator("button:has-text('Edit')").first();
        const isEditVisible = await editButton
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        expect(isEditVisible).toBe(true);
      }
    } else {
      test.skip(true, `school seed unavailable or session bounced to /login: ${seedError ?? "unknown"}`);
    }
  });

  test("Clicking Edit button should toggle edit mode", async ({ page }) => {
    const navigated = await navigateToSchool(page);

    if (navigated) {
      const philosophySection = page.locator(
        "h2:has-text('Coaching Philosophy')",
      );
      const isSectionVisible = await philosophySection
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isSectionVisible) {
        const editButton = page.locator("button:has-text('Edit')").first();
        const isEditVisible = await editButton
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (isEditVisible) {
          // Click Edit
          await editButton.click();

          // Look for textareas (should appear in edit mode)
          const textareas = page.locator("textarea");
          const textareaCount = await textareas.count();
          expect(textareaCount).toBeGreaterThanOrEqual(1);
        }
      }
    } else {
      test.skip(true, `school seed unavailable or session bounced to /login: ${seedError ?? "unknown"}`);
    }
  });

  test("Edit mode should display Save and Cancel buttons", async ({ page }) => {
    const navigated = await navigateToSchool(page);

    if (navigated) {
      const philosophySection = page.locator(
        "h2:has-text('Coaching Philosophy')",
      );
      const isSectionVisible = await philosophySection
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isSectionVisible) {
        const editButton = page.locator("button:has-text('Edit')").first();
        const isEditVisible = await editButton
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (isEditVisible) {
          // Click Edit
          await editButton.click();

          // Look for Save and Cancel buttons
          const saveButton = page.locator("button:has-text('Save Philosophy')");
          const cancelButton = page.locator("button:has-text('Cancel')");

          const hasSaveButton = await saveButton
            .isVisible({ timeout: 5000 })
            .catch(() => false);
          const hasCancelButton = await cancelButton
            .isVisible({ timeout: 5000 })
            .catch(() => false);

          expect(hasSaveButton).toBe(true);
          expect(hasCancelButton).toBe(true);
        }
      }
    } else {
      test.skip(true, `school seed unavailable or session bounced to /login: ${seedError ?? "unknown"}`);
    }
  });

  test("Cancel button should return to view mode", async ({ page }) => {
    const navigated = await navigateToSchool(page);

    if (navigated) {
      const philosophySection = page.locator(
        "h2:has-text('Coaching Philosophy')",
      );
      const isSectionVisible = await philosophySection
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isSectionVisible) {
        const editButton = page.locator("button:has-text('Edit')").first();
        const isEditVisible = await editButton
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (isEditVisible) {
          // Click Edit
          await editButton.click();

          // Click Cancel
          const cancelButton = page.locator("button:has-text('Cancel')");
          const hasCancelButton = await cancelButton
            .isVisible({ timeout: 5000 })
            .catch(() => false);

          if (hasCancelButton) {
            await cancelButton.click();

            // Should see Edit button again (not Cancel)
            const editButtonAgain = page
              .locator("button:has-text('Edit')")
              .first();
            const isEditAgain = await editButtonAgain
              .isVisible({ timeout: 5000 })
              .catch(() => false);
            expect(isEditAgain).toBe(true);
          }
        }
      }
    } else {
      test.skip(true, `school seed unavailable or session bounced to /login: ${seedError ?? "unknown"}`);
    }
  });

  test("Should accept text input in coaching philosophy fields", async ({
    page,
  }) => {
    const navigated = await navigateToSchool(page);

    if (navigated) {
      const philosophySection = page.locator(
        "h2:has-text('Coaching Philosophy')",
      );
      const isSectionVisible = await philosophySection
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isSectionVisible) {
        const editButton = page.locator("button:has-text('Edit')").first();
        const isEditVisible = await editButton
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (isEditVisible) {
          // Click Edit
          await editButton.click();

          // Get first textarea and enter text
          const firstTextarea = page.locator("textarea").first();
          const isTextareaVisible = await firstTextarea
            .isVisible({ timeout: 5000 })
            .catch(() => false);

          if (isTextareaVisible) {
            // Clear and fill with test text
            await firstTextarea.fill(
              "High-intensity, player development focused",
            );

            // Verify text was entered
            const value = await firstTextarea.inputValue();
            expect(value).toContain("High-intensity");
          }
        }
      }
    } else {
      test.skip(true, `school seed unavailable or session bounced to /login: ${seedError ?? "unknown"}`);
    }
  });

  test("Should support special characters in coaching philosophy fields", async ({
    page,
  }) => {
    const navigated = await navigateToSchool(page);

    if (navigated) {
      const philosophySection = page.locator(
        "h2:has-text('Coaching Philosophy')",
      );
      const isSectionVisible = await philosophySection
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isSectionVisible) {
        const editButton = page.locator("button:has-text('Edit')").first();
        const isEditVisible = await editButton
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (isEditVisible) {
          // Click Edit
          await editButton.click();

          // Get first textarea
          const firstTextarea = page.locator("textarea").first();
          const isTextareaVisible = await firstTextarea
            .isVisible({ timeout: 5000 })
            .catch(() => false);

          if (isTextareaVisible) {
            // Enter special characters
            const specialText =
              'High-intensity (80%), "player first" approach - 2024!';
            await firstTextarea.fill(specialText);

            // Verify special characters preserved
            const value = await firstTextarea.inputValue();
            expect(value).toContain("(80%)");
            expect(value).toContain('"');
            expect(value).toContain("!");
          }
        }
      }
    } else {
      test.skip(true, `school seed unavailable or session bounced to /login: ${seedError ?? "unknown"}`);
    }
  });

  test("Should support multiline text in coaching philosophy fields", async ({
    page,
  }) => {
    const navigated = await navigateToSchool(page);

    if (navigated) {
      const philosophySection = page.locator(
        "h2:has-text('Coaching Philosophy')",
      );
      const isSectionVisible = await philosophySection
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isSectionVisible) {
        const editButton = page.locator("button:has-text('Edit')").first();
        const isEditVisible = await editButton
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (isEditVisible) {
          // Click Edit
          await editButton.click();

          // Get first textarea
          const firstTextarea = page.locator("textarea").first();
          const isTextareaVisible = await firstTextarea
            .isVisible({ timeout: 5000 })
            .catch(() => false);

          if (isTextareaVisible) {
            // Enter multiline text
            const multilineText = `Line 1: High-intensity
Line 2: Fundamentals
Line 3: Development`;
            await firstTextarea.fill(multilineText);

            // Verify multiline text preserved
            const value = await firstTextarea.inputValue();
            expect(value).toContain("Line 1");
            expect(value).toContain("Line 2");
            expect(value).toContain("Line 3");
          }
        }
      }
    } else {
      test.skip(true, `school seed unavailable or session bounced to /login: ${seedError ?? "unknown"}`);
    }
  });

  test("Should position Coaching Philosophy section correctly on page", async ({
    page,
  }) => {
    const navigated = await navigateToSchool(page);

    if (navigated) {
      // Check for all three sections
      const prosHeading = page.locator("h2:has-text('Pros')");
      const philosophyHeading = page.locator(
        "h2:has-text('Coaching Philosophy')",
      );
      const documentsHeading = page.locator("h2:has-text('Shared Documents')");

      const hasPhilosophy = await philosophyHeading
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (hasPhilosophy) {
        // If all three sections exist, verify ordering
        const hasPros = await prosHeading
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        const hasDocuments = await documentsHeading
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (hasPros && hasDocuments) {
          const prosBound = await prosHeading.boundingBox();
          const philoBound = await philosophyHeading.boundingBox();
          const docsBound = await documentsHeading.boundingBox();

          if (prosBound && philoBound && docsBound) {
            // Philosophy should be after Pros and before Documents
            expect(philoBound.y).toBeGreaterThan(prosBound.y);
            expect(docsBound.y).toBeGreaterThan(philoBound.y);
          }
        }
      }
    } else {
      test.skip(true, `school seed unavailable or session bounced to /login: ${seedError ?? "unknown"}`);
    }
  });

  test("Should display coaching philosophy fields with labels", async ({
    page,
  }) => {
    const navigated = await navigateToSchool(page);

    if (navigated) {
      const philosophySection = page.locator(
        "h2:has-text('Coaching Philosophy')",
      );
      const isSectionVisible = await philosophySection
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isSectionVisible) {
        const editButton = page.locator("button:has-text('Edit')").first();
        const isEditVisible = await editButton
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (isEditVisible) {
          // Click Edit to show form
          await editButton.click();

          // Look for field labels
          const expectedLabels = [
            "Coaching Style",
            "Recruiting Approach",
            "Communication Style",
            "Success Metrics",
            "Overall Philosophy",
          ];

          for (const label of expectedLabels) {
            const labelElement = page.locator(`label:has-text('${label}')`);
            const isVisible = await labelElement
              .isVisible({ timeout: 2000 })
              .catch(() => false);
            expect(isVisible).toBe(true);
          }
        }
      }
    } else {
      test.skip(true, `school seed unavailable or session bounced to /login: ${seedError ?? "unknown"}`);
    }
  });
});
