import { test, expect } from "@playwright/test";
import {
  getSupabaseAdmin,
  deleteOneOffTestUser,
} from "./seed/helpers/supabase-admin";

/**
 * Full journey for a 13-17 player who skips naming a guardian at signup: account
 * creation succeeds, the dashboard shows the "invite a parent" banner (not the
 * old under-18 signup-time block), coach messaging is blocked, and inviting a
 * guardian from the banner later unlocks it once confirmed.
 *
 * Regression coverage for docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md.
 *
 * Deviations from a plain "signup -> dashboard" journey, confirmed against the
 * real code rather than assumed:
 *
 * 1. POST /api/auth/signup-minor creates the account server-side
 *    (auto-confirmed) but doesn't sign in for us — pages/signup.vue's
 *    submitMinorSignup calls supabase.auth.signInWithPassword() itself right
 *    after, same pattern as the adult path (composables/useAuth.ts's
 *    signup()). A real browser session exists before the client ever
 *    navigates anywhere; there's no separate /login step to drive.
 * 2. middleware/onboarding.global.ts redirects any player
 *    without users.phase_milestone_data.onboarding_complete === true to
 *    /onboarding — true for every signup path, not specific to this flow (see
 *    tests/e2e/signup-flow.spec.ts, which already asserts /onboarding for a
 *    full adult signup). Driving the real assessment-based onboarding wizard is
 *    out of scope for what this spec proves (the guardian-skip banner/lock
 *    state), so onboarding completion + the player's primary_sport preference
 *    are seeded directly via admin write — the same "skip an unrelated flow via
 *    admin helpers" pattern tests/e2e/minor-invite-accept.spec.ts uses for
 *    family_units/family_members rather than driving an invite UI.
 * 3. POST /api/guardian/resend creates the guardian_claims row BEFORE it
 *    attempts to send the confirmation email, but throws (502) if that send
 *    fails, and the client's useGuardianStatus.resend() only re-fetches
 *    status on the success path — so a transient/unconfigured email
 *    provider leaves the banner showing stale state even though the claim
 *    row was written. This spec reloads the page rather than relying on the
 *    submit's own success path, so the assertion reflects the server's real
 *    state (what the guardian_claims token check below independently
 *    confirms) rather than depending on a live outbound email succeeding
 *    within the test run.
 */
const RUN = Date.now();
const PLAYER_EMAIL = `skip-guardian-player-${RUN}@example.com`;
const GUARDIAN_EMAIL = `skip-guardian-parent-${RUN}@example.com`;
const PASSWORD = "SkipGuardian123!";

test.describe("signup: skip the guardian step", () => {
  // Must start unauthenticated — same override tests/e2e/signup-flow.spec.ts
  // and minor-invite-accept.spec.ts use, since the default project storageState
  // pre-authenticates as the shared player.json account.
  test.use({ storageState: { cookies: [], origins: [] } });

  test.afterAll(async () => {
    // family_units.created_by_user_id -> public.users has no ON DELETE CASCADE
    // (unlike user_preferences/guardian_claims, which do cascade transitively
    // through auth.users) — deleting the auth user first would leave this FK
    // dangling and abort the whole delete. Clean up family rows first, mirroring
    // minor-invite-accept.spec.ts's afterAll ordering. Wrapped in try/finally so a
    // throw partway through this cleanup can't leave the auth user leaked.
    try {
      const supabase = getSupabaseAdmin();
      const { data: player } = await supabase
        .from("users")
        .select("id")
        .eq("email", PLAYER_EMAIL)
        .maybeSingle();
      if (player?.id) {
        const { data: unit } = await supabase
          .from("family_units")
          .select("id")
          .eq("created_by_user_id", player.id)
          .maybeSingle();
        if (unit?.id) {
          await supabase
            .from("family_members")
            .delete()
            .eq("family_unit_id", unit.id);
          await supabase.from("family_units").delete().eq("id", unit.id);
        }
      }
    } finally {
      await deleteOneOffTestUser(PLAYER_EMAIL).catch(() => {});
    }
  });

  test("skip at signup -> dashboard banner -> messaging blocked -> invite later -> confirmed -> unlocked", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page.click('[data-testid="user-type-player"]');

    await page.fill("#firstName", "Skip");
    await page.fill("#lastName", "Tester");
    await page.fill("#dateOfBirth", "2012-01-01");
    await page.fill("#email", PLAYER_EMAIL);
    await page.fill("#password", PASSWORD);
    await page.fill("#confirmPassword", PASSWORD);
    await page.getByTestId("signup-step-continue").click();

    await expect(page.getByTestId("signup-guardian-skip")).toBeVisible();
    await page.getByTestId("signup-guardian-skip").click();

    await page.selectOption("#signup-graduation-year", { label: "2029" });
    await page.selectOption("#signup-primary-sport", "Basketball");
    await page.check("#agreeToTerms");
    await page.getByTestId("signup-button").click();

    // The client signs itself in right after account creation (see file
    // header) and lands on a real session immediately — onboarding isn't
    // complete yet, so the global middleware redirects to /onboarding on
    // this very first navigation, same as the adult signup path.
    await page.waitForURL(/\/onboarding/, { timeout: 15000 });

    const supabase = getSupabaseAdmin();
    const { data: player } = await supabase
      .from("users")
      .select("id")
      .eq("email", PLAYER_EMAIL)
      .single();
    expect(player?.id).toBeTruthy();
    const playerId = player!.id as string;

    // Seed past the (unrelated) onboarding wizard — see file header. Sets both
    // the completion flag the global middleware checks and the primary_sport
    // preference its sport-gate checks, so /dashboard is reachable on the very
    // first post-login navigation with no dependency on the SIGNED_IN
    // listener's own async flush of the same data racing the middleware.
    const { error: onboardingError } = await supabase
      .from("users")
      .update({
        phase_milestone_data: {
          onboarding_complete: true,
          onboarding_completed_at: new Date().toISOString(),
        },
      })
      .eq("id", playerId);
    expect(onboardingError).toBeNull();

    const { error: prefsError } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: playerId,
          category: "player",
          data: { primary_sport: "Basketball", graduation_year: 2029 },
        },
        { onConflict: "user_id,category" },
      );
    expect(prefsError).toBeNull();

    // The browser session from signup is already real (see file header) —
    // no separate login needed. Navigate to /dashboard directly now that
    // onboarding is seeded complete.
    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByText(/invite a parent or guardian/i)).toBeVisible();

    // Coach messaging stays server-enforced-locked even though the client never
    // showed a guardian requirement at signup. Auth here is a Bearer token
    // pulled from the browser's own session (this app authenticates API calls
    // via Authorization: Bearer, not a cookie — see file header/task-8-report.md);
    // athleteUserId is required by the endpoint's zod schema.
    const accessToken = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
      );
      if (!key) return null;
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw).access_token ?? null) : null;
    });
    expect(accessToken).toBeTruthy();

    const response = await page.request.post("/api/athlete/messages", {
      data: {
        athleteUserId: playerId,
        schoolId: "00000000-0000-0000-0000-000000000000",
        body: "hello",
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(403);

    // Invite a guardian from the banner. Don't assert on the resend response's
    // own status — see file header note 3: the claim row is written before the
    // confirmation email is attempted, and this environment doesn't send real
    // email, so the request can 502 even though the write it's really proving
    // (the guardian_claims row) already landed. Confirm that write directly.
    const resendResponsePromise = page.waitForResponse((r) =>
      r.url().includes("/api/guardian/resend"),
    );
    await page.getByTestId("guardian-invite-email").fill(GUARDIAN_EMAIL);
    await page.getByTestId("guardian-invite-submit").click();
    await resendResponsePromise;

    // Confirm as the guardian via the admin API directly (mirrors
    // tests/e2e/minor-invite-accept.spec.ts's pattern of using admin helpers to
    // drive state that would otherwise need a second browser session/inbox).
    const { data: claim } = await supabase
      .from("guardian_claims")
      .select("id, token")
      .eq("guardian_email", GUARDIAN_EMAIL)
      .single();
    expect(claim?.token).toBeTruthy();

    // Reload rather than trust the submit's own client-side toast/reload —
    // see file header note 3 — to confirm the *server's* locked/pending state
    // (not just a client-local flag) renders the right banner.
    await page.reload();
    await expect(
      page.getByText(/waiting on your parent or guardian/i),
    ).toBeVisible();

    // Simulate the guardian confirming, via the same DB effects
    // claim/[token]/accept.post.ts writes (stamp guardian_consent_at on the player,
    // close the claim) — driving the full guardian-side sign-in/accept UI to produce
    // the same state is out of scope here (already covered by
    // minor-invite-accept.spec.ts's sibling specs); this is the minimal correct way
    // to simulate "guardian confirmed" for what this spec is actually proving: that
    // the lock genuinely lifts once consent lands, not just that the invite sends.
    const { error: consentError } = await supabase
      .from("users")
      .update({ guardian_consent_at: new Date().toISOString() })
      .eq("id", playerId);
    expect(consentError).toBeNull();

    const { error: claimCloseError } = await supabase
      .from("guardian_claims")
      .update({ status: "claimed", claimed_at: new Date().toISOString() })
      .eq("id", claim!.id);
    expect(claimCloseError).toBeNull();

    // Re-check the messaging endpoint with the same session/token used for the
    // earlier 403 — this is the unlock half of the feature's core promise.
    const unlockedResponse = await page.request.post("/api/athlete/messages", {
      data: {
        athleteUserId: playerId,
        schoolId: "00000000-0000-0000-0000-000000000000",
        body: "hello",
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(unlockedResponse.status()).not.toBe(403);
  });
});
