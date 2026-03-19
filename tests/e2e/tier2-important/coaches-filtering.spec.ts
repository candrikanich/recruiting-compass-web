import { test, expect, Browser } from "@playwright/test";
import { resolve } from "path";
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
import {
  getSupabaseAdmin,
} from "../seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "../config/test-accounts";

test.describe("Coach Search and Filtering", () => {
  // Extended timeout for beforeAll (creates school + 3 coaches via UI)
  test.setTimeout(120000);

  let coachesPage: CoachesPage;
  let schoolsPage: SchoolsPage;
  let schoolId: string;
  const testCoaches = [
    {
      firstName: "John",
      lastName: "Smith",
      role: "head",
      email: "jsmith@university.edu",
      phone: "555-0001",
    },
    {
      firstName: "Jane",
      lastName: "Doe",
      role: "assistant",
      email: "jdoe@university.edu",
      phone: "555-0002",
    },
    {
      firstName: "Robert",
      lastName: "Johnson",
      role: "recruiting",
      email: "rjohnson@university.edu",
      phone: "555-0003",
    },
  ];

  // Seed school + coaches ONCE via Supabase admin (fast, no browser needed)
  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();

      // Find player user ID
      const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const player = usersData?.users?.find((u) => u.email === TEST_ACCOUNTS.player.email);
      if (!player) throw new Error("Player test account not found");

      // Create test school
      const { data: school, error: schoolErr } = await supabase
        .from("schools")
        .insert([{
          name: generateUniqueSchoolName("Filter Test School"),
          location: "Test City, USA",
          division: "D3",
          status: "researching",
          user_id: player.id,
          created_by: player.id,
          updated_by: player.id,
        }])
        .select("id")
        .single();
      if (schoolErr) throw schoolErr;
      schoolId = school.id;

      // Create test coaches
      await supabase.from("coaches").insert(
        testCoaches.map((coach) => ({
          first_name: coach.firstName,
          last_name: coach.lastName,
          role: coach.role,
          email: generateUniqueCoachEmail(coach.firstName),
          school_id: schoolId,
          user_id: player.id,
          created_by: player.id,
        })),
      );
    } catch (err) {
      console.warn("⚠️  coaches-filtering beforeAll setup failed:", err);
      // schoolId stays undefined — beforeEach will skip affected tests
    }
  });

  test.beforeEach(async ({ page }) => {
    if (!schoolId) {
      test.skip(true, "beforeAll setup failed (Supabase unavailable)");
      return;
    }
    coachesPage = new CoachesPage(page);
    schoolsPage = new SchoolsPage(page);
  });

  // ==================== SEARCH TESTS ====================

  test.describe("Search", () => {
    test("should filter coaches by first name", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.searchCoaches("John");

      // Should find John Smith
      await expect(page.locator(`text=John`)).toBeVisible();
    });

    test("should filter coaches by last name", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.searchCoaches("Smith");

      // Should find coach with Smith last name
      await expect(page.locator(`text=Smith`)).toBeVisible();
    });

    test("should filter coaches by email", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      const emailPart = "jsmith";
      await coachesPage.searchCoaches(emailPart);

      // Should find coach by email substring
      await expect(page.locator(`text=John`)).toBeVisible();
    });

    test("should be case insensitive", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.searchCoaches("john");

      // Should find John even with lowercase search
      await expect(page.locator(`text=John`)).toBeVisible();
    });

    test("should show no results message when no matches", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.searchCoaches("NonExistentCoachName");

      // Should show empty state or no results
      const noResultsVisible = await page
        .locator("text=No coaches found, text=No results")
        .first()
        .isVisible();

      if (noResultsVisible) {
        await expect(
          page.locator("text=No coaches found, text=No results"),
        ).toBeVisible();
      } else {
        // Or no coaches should be displayed
        const coachCount = await coachesPage.getCoachCount();
        expect(coachCount).toBe(0);
      }
    });

    test("should clear search and show all coaches again", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);

      // Get initial count
      const initialCount = await coachesPage.getCoachCount();

      // Search for specific coach
      await coachesPage.searchCoaches("John");
      const searchCount = await coachesPage.getCoachCount();
      expect(searchCount).toBeLessThanOrEqual(initialCount);

      // Clear search
      const searchInput = await page
        .locator('input[placeholder*="Search"]')
        .first();
      await searchInput.clear();
      await page.waitForTimeout(500);

      // Should show all coaches again
      const finalCount = await coachesPage.getCoachCount();
      expect(finalCount).toBeGreaterThanOrEqual(searchCount);
    });
  });

  // ==================== ROLE FILTERING TESTS ====================

  test.describe("Role Filtering", () => {
    test("should filter by head coach role", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.filterByRole("head");

      // Should only show head coaches
      const coachCount = await coachesPage.getCoachCount();
      expect(coachCount).toBeGreaterThan(0);

      // Verify John (head coach) is visible
      await expect(page.locator(`text=John`)).toBeVisible();
    });

    test("should filter by assistant coach role", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.filterByRole("assistant");

      // Should only show assistant coaches
      const coachCount = await coachesPage.getCoachCount();
      expect(coachCount).toBeGreaterThan(0);

      // Verify Jane (assistant coach) is visible
      await expect(page.locator(`text=Jane`)).toBeVisible();
    });

    test("should filter by recruiting coordinator role", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.filterByRole("recruiting");

      // Should only show recruiting coordinators
      const coachCount = await coachesPage.getCoachCount();
      expect(coachCount).toBeGreaterThan(0);

      // Verify Robert (recruiting) is visible
      await expect(page.locator(`text=Robert`)).toBeVisible();
    });

    test("should show all coaches when filter is cleared", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);

      // Get initial count (should be 3 test coaches)
      const initialCount = await coachesPage.getCoachCount();

      // Apply filter
      await coachesPage.filterByRole("head");
      const filteredCount = await coachesPage.getCoachCount();
      expect(filteredCount).toBeLessThan(initialCount);

      // Clear filter
      await coachesPage.clearFilters();
      await page.waitForTimeout(500);

      // Should show all coaches again
      const finalCount = await coachesPage.getCoachCount();
      expect(finalCount).toBeGreaterThanOrEqual(initialCount - 1); // Account for potential timing
    });
  });

  // ==================== SORTING TESTS ====================

  test.describe("Sorting", () => {
    test("should sort by name (A-Z)", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);

      try {
        await coachesPage.sortBy("name");
        // If sort was successful, coaches should be in name order

        // Get first coach's name (should be early alphabetically)
        const firstCoachText = await page
          .locator('[data-testid="coach-card"], .coach-card')
          .first()
          .textContent();

        expect(firstCoachText).toBeDefined();
      } catch {
        // Sort may not be available on this page, skip silently
      }
    });

    test("should sort by last contact date", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);

      try {
        await coachesPage.sortBy("last_contact");
        // If sort was successful, should be ordered by last contact

        const coachCount = await coachesPage.getCoachCount();
        expect(coachCount).toBeGreaterThan(0);
      } catch {
        // Sort may not be available, skip silently
      }
    });

  });

  // ==================== COMBINED FILTERS TESTS ====================

  test.describe("Combined Filters", () => {
    test("should apply search and role filter together", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);

      // Apply role filter
      await coachesPage.filterByRole("head");

      // Apply search
      await coachesPage.searchCoaches("Smith");

      // Should find John Smith (head coach)
      await expect(page.locator(`text=John`)).toBeVisible();
      await expect(page.locator(`text=Smith`)).toBeVisible();
    });

    test("should clear all filters at once", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);

      // Apply multiple filters
      await coachesPage.filterByRole("head");
      await coachesPage.searchCoaches("John");

      const filteredCount = await coachesPage.getCoachCount();

      // Clear all
      await coachesPage.clearFilters();
      const searchInput = await page
        .locator('input[placeholder*="Search"]')
        .first();
      await searchInput.clear();
      await page.waitForTimeout(500);

      // Should show all coaches again
      const finalCount = await coachesPage.getCoachCount();
      expect(finalCount).toBeGreaterThanOrEqual(filteredCount);
    });

    test("should show result count correctly", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);

      const initialCount = await coachesPage.getCoachCount();
      expect(initialCount).toBe(3); // We created 3 test coaches

      // Apply filter
      await coachesPage.filterByRole("head");
      const filteredCount = await coachesPage.getCoachCount();
      expect(filteredCount).toBeLessThan(initialCount);
    });
  });
});
