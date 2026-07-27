import { test, expect } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import {
  getSupabaseAdmin,
  findUserIdByEmail,
  seedSchoolsWithInteractions,
  deleteSeededSchools,
  type SeededSchools,
} from "../seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "../config/test-accounts";

/**
 * Phase 4 (auth lifecycle) AC1: "Logout → login as different account in same
 * tab shows zero prior-account data (schools, coaches, offers, family
 * header) — verified in browser."
 *
 * Regression coverage for the pre-fix bug: stores/schools.ts, stores/
 * coaches.ts, stores/offers.ts had no reset() wired to logout, and the
 * shared useFamilyContext singleton was never cleared — so a second account
 * logging in in the same tab still rendered the first account's data until a
 * hard reload.
 *
 * This test deliberately does NOT use the shared `player.json` /
 * `admin.json` storageState fixtures — it starts from a fully unauthenticated
 * context and drives real UI login/logout for both accounts itself, so the
 * global-scope supabase.auth.signOut() this test triggers never revokes a
 * token another parallel worker is relying on. Run in isolation
 * (`--workers=1` against this file) if running outside this suite's own
 * worker allocation.
 */
test.describe("Cross-account logout — no stale data leak", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const RUN_ID = Date.now();
  const UNIQUE_SCHOOL_NAME = `[e2e-${RUN_ID}] Cross-Account Leak Check`;
  let seeded: SeededSchools | null = null;
  let playerFamilyUnitId: string | null = null;

  test.beforeAll(async () => {
    const supabase = getSupabaseAdmin();
    const playerId = await findUserIdByEmail(
      supabase,
      TEST_ACCOUNTS.player.email,
    );
    if (!playerId) {
      throw new Error(
        `${TEST_ACCOUNTS.player.email} not found — global setup must run first`,
      );
    }
    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", playerId)
      .maybeSingle();
    const familyUnitId = (membership as { family_unit_id: string } | null)
      ?.family_unit_id;
    if (!familyUnitId) {
      throw new Error(`${TEST_ACCOUNTS.player.email} has no family_unit_id`);
    }
    playerFamilyUnitId = familyUnitId;

    seeded = await seedSchoolsWithInteractions(supabase, {
      familyUnitId,
      userId: playerId,
      runId: RUN_ID,
      count: 1,
    });
    // Give it the distinctive name this test asserts on (helper's default
    // naming already embeds RUN_ID, but rename explicitly for clarity/
    // uniqueness independent of the helper's internal format).
    await supabase
      .from("schools")
      .update({ name: UNIQUE_SCHOOL_NAME })
      .in("id", seeded.schoolIds);
  });

  test.afterAll(async () => {
    if (!seeded) return;
    await deleteSeededSchools(getSupabaseAdmin(), seeded);
  });

  /** Extract `?family_unit_id=eq.<uuid>` from a captured schools REST request URL. */
  const extractFamilyUnitIdFilter = (url: string): string | null => {
    const match = url.match(/family_unit_id=eq\.([0-9a-f-]+)/i);
    return match?.[1] ?? null;
  };

  test("logging in as a different account in the same tab shows none of the previous account's data", async ({
    page,
  }) => {
    const authPage = new AuthPage(page);

    // Independently confirm which family_unit_id the *query the browser
    // actually sends* uses, for each account — this is the root-cause
    // assertion. Pre-fix, the useActiveFamily instance behind app.vue's
    // provide('activeFamily', ...) only re-resolves playerFamilyId when
    // userStore.user?.role *changes*; since both test accounts here have
    // role "player", that reinit watcher never re-fires on account switch,
    // so activeFamilyId (and therefore the family_unit_id filter sent to
    // Supabase) stays stuck on the FIRST account's family forever. RLS then
    // silently returns zero rows for the second account (wrong family, no
    // membership) — which makes the schools list *look* correctly empty by
    // accident, masking the bug from a list-content-only assertion. Capturing
    // the actual outgoing request avoids that false negative.
    const schoolsRequestFamilyIds: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/rest/v1/schools") && req.method() === "GET") {
        const id = extractFamilyUnitIdFilter(req.url());
        if (id) schoolsRequestFamilyIds.push(id);
      }
    });

    // IMPORTANT: after the first login, every navigation below uses in-app
    // SPA routing (clicking nav links), never page.goto()/page.reload().
    // page.goto() forces a full browser navigation that reloads the JS
    // bundle from scratch — which would reset Pinia stores and the
    // useFamilyContext module singleton regardless of whether this phase's
    // fix exists, making the test pass vacuously. The bug this phase fixes
    // only reproduces within one continuous JS session (client-side route
    // changes), which is what a real user's browser tab does.

    // 1. Log in as the player account and confirm the seeded school is
    // visible via an in-app nav click — proves the assertion below isn't
    // vacuously true.
    await authPage.goto();
    await authPage.login(
      TEST_ACCOUNTS.player.email,
      TEST_ACCOUNTS.player.password,
    );
    await page.locator('[data-testid="nav-schools"]').click();
    await page.waitForURL("/schools");
    await expect(page.getByText(UNIQUE_SCHOOL_NAME)).toBeVisible({
      timeout: 15000,
    });

    // 2. Real logout via the app's own UI — exercises useAuthLifecycle's
    // logoutEverywhere() (Supabase provider sign-out + every domain store's
    // reset() + family-context reset), not a manual localStorage wipe. The
    // app's own handleLogout() does `navigateTo("/login")`, a client-side
    // route change — the JS session (and any un-reset module state) survives.
    await authPage.logout();
    await authPage.expectLoginPage();

    // 3. Log in as a completely different account, same browser tab/context,
    // same JS session (the login form submit is also a client-side redirect).
    await authPage.login(
      TEST_ACCOUNTS.admin.email,
      TEST_ACCOUNTS.admin.password,
    );

    // 4. Navigate to /schools via the same in-app nav link used in step 1 —
    // the previous account's schools must be gone, not a stale render left
    // over from the pre-fix stores/schools.ts (no reset(), isFetched guard
    // not family-keyed) or the pre-fix useFamilyContext singleton (never
    // cleared on logout).
    schoolsRequestFamilyIds.length = 0;
    await page.locator('[data-testid="nav-schools"]').click();
    await page.waitForURL("/schools");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(UNIQUE_SCHOOL_NAME)).not.toBeVisible();

    // 5. Family/profile header must reflect the new account, not the old one.
    await expect(
      page.getByText(TEST_ACCOUNTS.player.displayName),
    ).not.toBeVisible();

    // 6. Root-cause assertion: the schools query the browser actually sent
    // while logged in as admin must be scoped to ADMIN's own family_unit_id,
    // not player's — proving the family context genuinely re-resolved for
    // the new account rather than RLS silently zero-rowing a stale query.
    const supabase = getSupabaseAdmin();
    const adminId = await findUserIdByEmail(supabase, TEST_ACCOUNTS.admin.email);
    const { data: adminMembership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", adminId)
      .maybeSingle();
    const adminFamilyUnitId = (
      adminMembership as { family_unit_id: string } | null
    )?.family_unit_id;

    expect(schoolsRequestFamilyIds.length).toBeGreaterThan(0);
    for (const familyIdSent of schoolsRequestFamilyIds) {
      expect(familyIdSent).not.toBe(playerFamilyUnitId);
      expect(familyIdSent).toBe(adminFamilyUnitId);
    }
  });
});
