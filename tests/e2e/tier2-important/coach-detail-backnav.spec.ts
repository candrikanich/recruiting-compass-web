import { test, expect } from "@playwright/test";
import { resolve } from "path";
import { generateUniqueSchoolName } from "../fixtures/schools.fixture";
import { generateUniqueCoachEmail } from "../fixtures/coaches.fixture";
import { getSupabaseAdmin } from "../seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "../config/test-accounts";

/**
 * Coach detail consolidation — legacy-redirect and back-link coverage.
 *
 * The legacy school-scoped route (`/schools/:schoolId/coaches/:coachId`) is
 * now a 301 redirect to the unified detail route (`/coaches/:coachId`),
 * carrying `back`/`label` query params so the page can render a
 * context-aware back-link (see composables/useBackLink.ts). This spec
 * follows the seed/teardown conventions of coaches-tile-navigation.spec.ts.
 */
test.describe("Coach detail — back-nav and legacy redirect", () => {
  test.describe.configure({ mode: "serial" });
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
  });

  let schoolId: string | undefined;
  let coachId: string | undefined;
  const coachLastName = `Backnav${Date.now()}`;

  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data: usersData } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const player = usersData?.users?.find(
        (u) => u.email === TEST_ACCOUNTS.player.email,
      );
      if (!player) throw new Error("Player test account not found");

      const { data: familyMember } = await supabase
        .from("family_unit_members")
        .select("family_unit_id")
        .eq("user_id", player.id)
        .maybeSingle();
      const familyUnitId = familyMember?.family_unit_id ?? null;

      const { data: school, error: schoolErr } = await supabase
        .from("schools")
        .insert([
          {
            name: generateUniqueSchoolName("Backnav School"),
            location: "Test City, USA",
            division: "D3",
            status: "researching",
            user_id: player.id,
            created_by: player.id,
            updated_by: player.id,
            family_unit_id: familyUnitId,
          },
        ])
        .select("id")
        .single();
      if (schoolErr) throw schoolErr;
      schoolId = school.id;

      const { data: coach, error: coachErr } = await supabase
        .from("coaches")
        .insert([
          {
            first_name: "Backnav",
            last_name: coachLastName,
            role: "head",
            email: generateUniqueCoachEmail("backnav"),
            phone: "555-0100",
            school_id: schoolId,
            user_id: player.id,
            created_by: player.id,
          },
        ])
        .select("id")
        .single();
      if (coachErr) throw coachErr;
      coachId = coach.id;
    } catch (err) {
      console.warn("⚠️  coach-detail-backnav beforeAll setup failed:", err);
      // schoolId/coachId stay undefined — beforeEach skips affected tests
    }
  });

  test.afterAll(async () => {
    if (!schoolId) return;
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("coaches").delete().eq("school_id", schoolId);
      await supabase.from("schools").delete().eq("id", schoolId);
    } catch (err) {
      console.warn("⚠️  coach-detail-backnav afterAll teardown failed:", err);
    }
  });

  test.beforeEach(() => {
    if (!schoolId || !coachId) {
      test.skip(true, "beforeAll setup failed (Supabase unavailable)");
    }
  });

  test("legacy school-scoped URL redirects to the unified detail route with a school-context back-link", async ({
    page,
  }) => {
    await page.goto(`/schools/${schoolId}/coaches/${coachId}`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(new RegExp(`/coaches/${coachId}(\\?.*)?$`));

    const backLink = page.getByRole("link", { name: "Back to Coaches" });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute(
      "href",
      `/schools/${schoolId}/coaches`,
    );
  });

  test("opening a tile from the global coach directory lands on detail with an all-coaches back-link", async ({
    page,
  }) => {
    await page.goto("/coaches");
    await page.waitForLoadState("networkidle");

    const tile = page.locator("a", { hasText: coachLastName }).first();
    await expect(tile).toBeVisible();
    await tile.click();

    await page.waitForURL(new RegExp(`/coaches/${coachId}`));
    await expect(page.getByText(coachLastName).first()).toBeVisible();

    const backLink = page.getByRole("link", { name: "Back to All Coaches" });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", /^\/coaches(\?.*)?$/);
  });
});
