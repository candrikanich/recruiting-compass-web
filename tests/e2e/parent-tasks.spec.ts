import { test, expect } from "@playwright/test";
import { resolve } from "path";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
  createOneOffTestUser,
  deleteOneOffTestUser,
} from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";

// pages/tasks/index.vue confirmed present.
// Confirmed testids: task-item, status-filter, urgency-filter, task-checkbox-*,
// deadline-badge, athlete-select.

const ATHLETE2 = {
  email: "e2e-tasks-athlete2@test.com",
  password: "TestPass123!",
  displayName: "Second Athlete",
};

// Parent-view tests (switcher, read-only) need parent context with ≥2 linked
// athletes. Seeded in beforeAll; gate those tests on it.
let parentSeedReady = false;
let athlete2Id: string | null = null;
let parentFamilyUnitId: string | null = null;

test.describe("Parent Task Viewing Workflow", () => {
  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      const playerId = await findUserIdByEmail(
        supabase,
        TEST_ACCOUNTS.player.email,
      );
      const parentId = await findUserIdByEmail(
        supabase,
        TEST_ACCOUNTS.parent.email,
      );
      if (!playerId || !parentId) return;

      // Player graduation year drives deadline computation (grade 10 → past-due
      // deadlines, so DeadlineBadge renders).
      await supabase
        .from("users")
        .update({ graduation_year: 2028 })
        .eq("id", playerId);

      const { data: pm } = await supabase
        .from("family_members")
        .select("family_unit_id")
        .eq("user_id", parentId)
        .eq("role", "parent")
        .maybeSingle();
      parentFamilyUnitId =
        (pm as { family_unit_id: string } | null)?.family_unit_id ?? null;
      if (!parentFamilyUnitId) return;

      // Second athlete in the same family unit → switcher shows ≥2 options.
      // beforeAll runs in every parallel worker, so creation races; on failure
      // fall back to the user another worker already created.
      let u = await createOneOffTestUser({ ...ATHLETE2, role: "player" }).catch(
        () => null,
      );
      if (!u) {
        const { data: list } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        u = list?.users?.find((x) => x.email === ATHLETE2.email) ?? null;
      }
      if (!u) return;
      athlete2Id = u.id;
      await supabase.from("users").upsert(
        {
          id: u.id,
          email: ATHLETE2.email,
          full_name: ATHLETE2.displayName,
          role: "player",
          graduation_year: 2027,
        },
        { onConflict: "id" },
      );
      const { data: existingLink } = await supabase
        .from("family_members")
        .select("id")
        .eq("family_unit_id", parentFamilyUnitId)
        .eq("user_id", u.id)
        .maybeSingle();
      if (!existingLink) {
        await supabase.from("family_members").insert({
          family_unit_id: parentFamilyUnitId,
          user_id: u.id,
          role: "player",
        });
      }
      parentSeedReady = true;
    } catch (e) {
      console.warn("⚠️  parent-tasks seed failed:", e);
    }
  });

  test.afterAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      if (athlete2Id && parentFamilyUnitId) {
        await supabase
          .from("family_members")
          .delete()
          .eq("family_unit_id", parentFamilyUnitId)
          .eq("user_id", athlete2Id);
      }
      await deleteOneOffTestUser(ATHLETE2.email);
    } catch {
      // non-fatal
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
  });

  test("tasks page loads for parent user", async ({ page }) => {
    await page.waitForSelector("h1");
    const header = page.locator("h1");
    const headerText = await header.textContent();
    expect(headerText).toMatch(/Tasks|Athlete/);
  });

  test("filter controls are visible", async ({ page }) => {
    await expect(page.locator("[data-testid='status-filter']")).toBeVisible();
    await expect(page.locator("[data-testid='urgency-filter']")).toBeVisible();
  });

  test("can filter tasks by status", async ({ page }) => {
    const statusFilter = page.locator("[data-testid='status-filter']");
    await expect(statusFilter).toBeVisible();
    await statusFilter.selectOption("not_started");

    // Filter applied without crashing — task list still renders
    await expect(page.locator("h1")).toBeVisible();
  });

  test("can filter tasks by urgency", async ({ page }) => {
    const urgencyFilter = page.locator("[data-testid='urgency-filter']");
    await expect(urgencyFilter).toBeVisible();
    await urgencyFilter.selectOption("critical");

    await expect(page.locator("h1")).toBeVisible();
  });

  test("can expand task details when tasks exist", async ({ page }) => {
    // Tasks load after auth + two API calls + render; the old 3s probe raced
    // the spinner. Wait properly for the first task to mount.
    const taskItem = page.locator("[data-testid='task-item']").first();
    await expect(taskItem).toBeVisible({ timeout: 15000 });
    const expandButton = taskItem.locator("button").first();
    await expandButton.click();
    const details = taskItem.locator(".border-t");
    await expect(details).toBeVisible();
  });

  test("sees deadline badges with correct urgency colors", async ({ page }) => {
    // Grade-10 task templates carry a deadline_offset_months; the server
    // computes deadline_date from the athlete's graduation_year, so badges
    // render once tasks load.
    await expect(
      page.locator("[data-testid='task-item']").first(),
    ).toBeVisible({ timeout: 15000 });
    const badges = page.locator("[data-testid='deadline-badge']");
    await expect(badges.first()).toBeVisible({ timeout: 15000 });
    expect(await badges.count()).toBeGreaterThan(0);
  });

  // Parent-context tests: a parent viewing a linked athlete. Uses parent
  // storageState and the seeded 2nd athlete.
  test.describe("as parent viewing a linked athlete", () => {
    test.use({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/parent.json"),
    });

    test("sees athlete switcher with multiple athletes", async ({ page }) => {
      test.skip(!parentSeedReady, "parent-tasks seed unavailable");
      const switcher = page.locator("[data-testid='athlete-select']");
      await expect(switcher).toBeVisible({ timeout: 15000 });
      const options = switcher.locator("option");
      expect(await options.count()).toBeGreaterThanOrEqual(2);
    });

    test("parent cannot toggle task checkboxes (read-only view)", async ({
      page,
    }) => {
      test.skip(!parentSeedReady, "parent-tasks seed unavailable");
      // Parent context resolves asynchronously after tasks first render, so the
      // checkbox can mount enabled and then disable once isViewingAsParent lands.
      // Poll for the disabled state rather than reading it once.
      const checkbox = page
        .locator("[data-testid*='task-checkbox-']")
        .first();
      await expect(checkbox).toBeVisible({ timeout: 15000 });
      await expect(checkbox).toBeDisabled({ timeout: 15000 });
    });
  });
});
