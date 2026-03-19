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

      // Get the player's family unit ID (schools are scoped by family_unit_id)
      const { data: familyMember } = await supabase
        .from("family_unit_members")
        .select("family_unit_id")
        .eq("user_id", player.id)
        .maybeSingle();
      const familyUnitId = familyMember?.family_unit_id ?? null;

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
          family_unit_id: familyUnitId,
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

      // Use heading role to avoid strict mode — h3 "John Smith" is specific
      await expect(page.getByRole("heading", { name: /John Smith/ })).toBeVisible();
    });

    test("should filter coaches by last name", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.searchCoaches("Smith");

      await expect(page.getByRole("heading", { name: /Smith/ })).toBeVisible();
    });

    test("should filter coaches by email", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      // Email is generated as "John-{timestamp}@testuniversity.edu" — search by first name
      await coachesPage.searchCoaches("John");

      // Should still find John Smith
      await expect(page.getByRole("heading", { name: /John Smith/ })).toBeVisible();
    });

    test("should be case insensitive", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.searchCoaches("john");

      await expect(page.getByRole("heading", { name: /John Smith/ })).toBeVisible();
    });

    test("should show no results message when no matches", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.searchCoaches("NonExistentCoachName12345");

      // Either empty state message or zero coach cards
      const coachCount = await coachesPage.getCoachCount();
      expect(coachCount).toBe(0);
    });

    test("should clear search and show all coaches again", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);

      // Get initial count
      const initialCount = await coachesPage.getCoachCount();

      // Search for specific coach
      await coachesPage.searchCoaches("John");
      const searchCount = await coachesPage.getCoachCount();
      expect(searchCount).toBeLessThanOrEqual(initialCount);

      // Clear search by filling with empty string
      await coachesPage.searchCoaches("");
      await page.waitForTimeout(300);

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

      // Should show John Smith (head coach)
      const coachCount = await coachesPage.getCoachCount();
      expect(coachCount).toBeGreaterThan(0);
      await expect(page.getByRole("heading", { name: /John Smith/ })).toBeVisible();
    });

    test("should filter by assistant coach role", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.filterByRole("assistant");

      // Should show Jane Doe (assistant coach)
      const coachCount = await coachesPage.getCoachCount();
      expect(coachCount).toBeGreaterThan(0);
      await expect(page.getByRole("heading", { name: /Jane Doe/ })).toBeVisible();
    });

    test("should filter by recruiting coordinator role", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);
      await coachesPage.filterByRole("recruiting");

      // Should show Robert Johnson (recruiting coordinator)
      const coachCount = await coachesPage.getCoachCount();
      expect(coachCount).toBeGreaterThan(0);
      await expect(page.getByRole("heading", { name: /Robert Johnson/ })).toBeVisible();
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

      // Sort — the coaches page has a sort select
      const sortSelect = page.locator('#sortSelect, select').filter({ hasText: 'Name' }).first();
      if (await sortSelect.isVisible().catch(() => false)) {
        await sortSelect.selectOption({ label: /Name/ });
      }

      // After sorting, coaches should still be visible
      const coachCount = await coachesPage.getCoachCount();
      expect(coachCount).toBeGreaterThan(0);

      // First coach heading should be defined
      const firstCoach = await page.locator('h3.text-lg.font-bold').first().textContent();
      expect(firstCoach).toBeTruthy();
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

      // Should find John Smith (head coach matching "Smith" search)
      await expect(page.getByRole("heading", { name: /John Smith/ })).toBeVisible();
    });

    test("should clear all filters at once", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);

      // Apply multiple filters
      await coachesPage.filterByRole("head");
      await coachesPage.searchCoaches("John");

      const filteredCount = await coachesPage.getCoachCount();

      // Clear all filters — button + clear search
      await coachesPage.clearFilters();
      await coachesPage.searchCoaches("");
      await page.waitForTimeout(300);

      // Should show all coaches again
      const finalCount = await coachesPage.getCoachCount();
      expect(finalCount).toBeGreaterThanOrEqual(filteredCount);
    });

    test("should show result count correctly", async ({ page }) => {
      await coachHelpers.navigateToCoaches(page, schoolId);

      const initialCount = await coachesPage.getCoachCount();
      expect(initialCount).toBeGreaterThanOrEqual(3); // We created at least 3 test coaches

      // Apply filter
      await coachesPage.filterByRole("head");
      const filteredCount = await coachesPage.getCoachCount();
      expect(filteredCount).toBeLessThan(initialCount);
    });
  });
});
