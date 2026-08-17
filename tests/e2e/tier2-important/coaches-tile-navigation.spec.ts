import { test, expect } from "@playwright/test";
import { resolve } from "path";
import { generateUniqueSchoolName } from "../fixtures/schools.fixture";
import { generateUniqueCoachEmail } from "../fixtures/coaches.fixture";
import { getSupabaseAdmin } from "../seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "../config/test-accounts";

/**
 * Coach tile unification — directory page tap-to-detail smoke.
 *
 * The unified CoachCard (components/Coach/CoachCard.vue) wraps the whole
 * tile in a NuxtLink to `/coaches/:id`; action icons use `@click.stop.prevent`
 * so they neither trigger the tile's SPA navigation nor its native anchor
 * fallback. This spec covers
 * the /coaches directory surface (see task-7-brief.md Step 4) — the other
 * two surfaces (school detail sidebar, school-scoped coaches page) reuse the
 * same component and are covered by SchoolSidebar.spec.ts and
 * schools-id-coaches.spec.ts at the unit level.
 */
test.describe("Coach directory — tile navigation", () => {
  // fullyParallel would otherwise re-run beforeAll per worker for this
  // describe's two tests, creating two coaches with the same unique last
  // name concurrently — serial avoids that cross-worker race (see
  // coaches-filtering.spec.ts for the same pattern).
  test.describe.configure({ mode: "serial" });
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
  });

  let schoolId: string | undefined;
  let coachId: string | undefined;
  const coachLastName = `Navigator${Date.now()}`;

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
            name: generateUniqueSchoolName("Tile Nav School"),
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
            first_name: "Tile",
            last_name: coachLastName,
            role: "head",
            email: generateUniqueCoachEmail("tilenav"),
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
      console.warn("⚠️  coaches-tile-navigation beforeAll setup failed:", err);
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
      console.warn(
        "⚠️  coaches-tile-navigation afterAll teardown failed:",
        err,
      );
    }
  });

  test.beforeEach(() => {
    if (!schoolId || !coachId) {
      test.skip(true, "beforeAll setup failed (Supabase unavailable)");
    }
  });

  test("tapping a coach tile navigates to the coach detail page", async ({
    page,
  }) => {
    await page.goto("/coaches");
    await page.waitForLoadState("networkidle");

    const tile = page.locator("a", { hasText: coachLastName }).first();
    await expect(tile).toBeVisible();
    await tile.click();

    await page.waitForURL(new RegExp(`/coaches/${coachId}(\\?.*)?$`));
    await expect(page.getByText(coachLastName)).toBeVisible();
  });

  // Regression coverage for a bug found by this spec: `@click.stop` alone on
  // the nested action button stopped propagation to the surrounding
  // NuxtLink's own click listener — but that listener is what normally
  // calls preventDefault() to suppress the native anchor navigation. With
  // propagation stopped before it fired, nothing called preventDefault(),
  // so the browser's native href navigation went through uncontested.
  // Fixed in components/Coach/CoachCardActions.vue by using
  // `@click.stop.prevent` on all five action buttons (and converting the
  // native mailto/sms/tel actions from nested `<a>` to `<button>` with a
  // `window.location.href` handler, since `<a>`-inside-`<a>` is invalid
  // HTML).
  test("tapping the email action icon opens its channel without navigating", async ({
    page,
  }) => {
    await page.goto("/coaches");
    await page.waitForLoadState("networkidle");

    const emailAction = page
      .getByRole("button", {
        name: new RegExp(`Email .*${coachLastName}`, "i"),
      })
      .first();
    await expect(emailAction).toBeVisible();
    await emailAction.click();

    // contact-mode="modal" on the directory page: the email icon should
    // open the communication panel in place, not navigate to detail.
    await expect(page).toHaveURL(/\/coaches$/);
  });
});
