import { test, expect } from "@playwright/test";
import { resolve } from "path";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
  createOneOffTestUser,
} from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";
import { soak, NODE_ALLOWANCE } from "./helpers/soak";

/**
 * Soak test — athlete switcher.
 *
 * A parent viewing a family keeps the app open all day and repeatedly switches
 * between athletes. Each switch resets the schools/coaches/offers Pinia stores
 * and refetches family members (composables/useActiveFamily.ts switchAthlete).
 * If any of that leaves listeners or detached DOM behind, it accumulates until
 * the tab crashes. This test cycles the switch ~60x and asserts counts do not
 * climb.
 *
 * Cadence: NIGHTLY, not per-PR — CDP readings vary run-to-run and would flake a
 * PR gate. Gated behind SOAK=1 so the normal suite skips it.
 */

const RUN_SOAK = process.env.SOAK === "1";

const ATHLETE2 = {
  email: "e2e-soak-athlete2@test.com",
  password: "TestPass123!",
  displayName: "Soak Second Athlete",
};

let seedReady = false;
let parentFamilyUnitId: string | null = null;

test.describe("Athlete switcher — memory soak", () => {
  test.skip(!RUN_SOAK, "soak tests run nightly only (set SOAK=1)");
  test.describe.configure({ mode: "serial" });

  // View as the parent so the switcher renders (needs parent + ≥2 athletes).
  test.use({
    storageState: resolve(process.cwd(), "tests/e2e/.auth/parent.json"),
  });

  test.beforeAll(async () => {
    try {
      const supabase = getSupabaseAdmin();
      const parentId = await findUserIdByEmail(
        supabase,
        TEST_ACCOUNTS.parent.email,
      );
      if (!parentId) return;

      const { data: pm } = await supabase
        .from("family_members")
        .select("family_unit_id")
        .eq("user_id", parentId)
        .eq("role", "parent")
        .maybeSingle();
      parentFamilyUnitId =
        (pm as { family_unit_id: string } | null)?.family_unit_id ?? null;
      if (!parentFamilyUnitId) return;

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
      seedReady = true;
    } catch (e) {
      console.warn("⚠️  athlete-switcher-soak seed failed:", e);
    }
  });

  // Do NOT delete the seeded auth user: rapid create/delete cycles leave the
  // email in Supabase's recently-deleted state and block recreation, starving
  // the switcher of a 2nd athlete. The seed is idempotent (beforeAll reuses the
  // existing user + link), so leaving it in place is safe and keeps runs stable.

  test("switching between athletes does not leak DOM nodes or listeners", async ({
    page,
  }) => {
    test.skip(!seedReady, "soak seed unavailable");
    // Soak loops + a cold-server first compile exceed the default 30s test cap.
    test.setTimeout(180000);

    // The switcher is parent-only and renders only after useActiveFamily
    // fetches the parent's families (profile load → isParent →
    // /api/family/accessible returns ≥2 athletes). On a cold dev/preview server
    // the first /tasks load also compiles the route, so give the initial assert
    // a generous timeout to absorb that; every subsequent switch is fast.
    await page.goto("/tasks");

    const switcher = page.locator("[data-testid='athlete-select']");
    await expect(switcher).toBeVisible({ timeout: 60000 });

    // Need ≥2 athletes to cycle between.
    const optionValues = await switcher
      .locator("option")
      .evaluateAll((opts) =>
        (opts as HTMLOptionElement[]).map((o) => o.value).filter(Boolean),
      );
    expect(optionValues.length).toBeGreaterThanOrEqual(2);

    const [a, b] = optionValues;
    let toggle = false;

    // One flow iteration = one full switch + settle. The switch resets the
    // schools/coaches/offers stores and refetches, so wait for the select to
    // reflect the new value before measuring the next loop.
    const runFlow = async () => {
      const next = toggle ? a : b;
      toggle = !toggle;
      await switcher.selectOption(next);
      await expect(switcher).toHaveValue(next);
      // Let the refetch + store reset settle before the next switch.
      await page.waitForLoadState("networkidle");
    };

    const { baseline, after } = await soak(page, runFlow, 60, 5);

    // eslint-disable-next-line no-console
    console.log(
      "[soak] athlete-switcher " + JSON.stringify({ baseline, after }),
    );

    expect(after.listeners).toBeLessThanOrEqual(baseline.listeners);
    expect(after.nodes).toBeLessThan(baseline.nodes + NODE_ALLOWANCE);
  });
});
