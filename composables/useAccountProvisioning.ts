import type { User } from "@supabase/supabase-js";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useOnboarding } from "~/composables/useOnboarding";
import type { PlayerDetails } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("account-provisioning");

// A page that already handles its own family setup after sign-in (the guardian-claim
// accept flow: /api/guardian/claim/[token]/accept both joins the guardian to the
// player's family AND creates one if needed) sets this immediately before calling
// signup()/login(). Without it, the SIGNED_IN listener's blind ensureAccountProvisioned
// call races that page's own explicit flow -- both independently check "does this user
// have a family?" and, seeing none yet, both create one, leaving the guardian split
// across two family_units (one real, one empty and orphaned). Found live on QA. A
// module-level flag (not a ref) is deliberate: it must be set synchronously before the
// async signup()/login() call, well before the async SIGNED_IN listener that consumes
// it ever runs, so there is no race on the flag itself.
let suppressNextFamilyCreate = false;
export const suppressAutoFamilyCreateOnNextSignIn = () => {
  suppressNextFamilyCreate = true;
};

/**
 * Backfills server-side state that a signup couldn't set up itself because
 * Supabase withheld the session until email confirmation (prod's
 * confirm-email setting) — the family unit, step-1 onboarding fields
 * drafted on the signup form itself (pending_* metadata, see
 * pages/signup.vue), and a pending family-invite acceptance (pending_invite_token
 * metadata, see pages/join.vue) so a new user doesn't re-answer them post-confirm.
 *
 * Admin promotion is deliberately NOT handled here. It never carries forward
 * as trusted metadata off the client-settable signup contract — it is
 * granted only via a synchronous, freshly-validated adminToken call to
 * /api/auth/admin-profile from pages/admin/signup.vue itself. Accounts are
 * always auto-confirmed with a session issued immediately, so that
 * synchronous call is the only path, and there is nothing to backfill here.
 *
 * Call this on every SIGNED_IN event, not just an explicit /login form
 * submit — Supabase's own confirmation-link redirect establishes a session
 * and fires SIGNED_IN too (it lands on "/", never on /login), and that path
 * used to silently skip provisioning entirely.
 *
 * Idempotent and non-blocking: /api/family/create checks for an existing
 * family first, the onboarding flush checks for existing player details
 * first, and a failure here must never break sign-in.
 */
export const useAccountProvisioning = () => {
  const { $fetchAuth } = useAuthFetch();

  const applyPendingOnboardingStep1 = async (user: User) => {
    const metadata = user.user_metadata ?? {};
    const primarySport = metadata.pending_primary_sport as string | undefined;
    if (!primarySport) return;

    try {
      const { getPlayerDetails, setPlayerDetails, setHomeLocation, loadAllPreferences } =
        usePreferenceManager();

      // Player details are a separate preferences store from the users table
      // (unlike is_admin), so they must be loaded before the idempotency
      // check can see what's already there.
      await loadAllPreferences();
      if (getPlayerDetails()?.primary_sport) return;

      const graduationYear = metadata.pending_graduation_year
        ? Number(metadata.pending_graduation_year)
        : undefined;
      const gender = metadata.pending_gender as
        | PlayerDetails["gender"]
        | undefined;
      const zipCode = metadata.pending_zip_code as string | undefined;

      const details: Partial<PlayerDetails> = {
        graduation_year: graduationYear,
        primary_sport: primarySport,
        ...(gender ? { gender } : {}),
      };
      await setPlayerDetails(details);

      if (zipCode) {
        await setHomeLocation({ zip: zipCode });
      }

      const { saveOnboardingStep } = useOnboarding();
      await saveOnboardingStep(1, {
        ...details,
        ...(zipCode ? { zip_code: zipCode } : {}),
      });
    } catch (err) {
      logger.error("Failed to apply pending onboarding step 1 on sign-in", err);
    }
  };

  /**
   * Consumes a family-invite token drafted at signup (pages/join.vue,
   * pending_invite_token metadata) once a real session exists. Deferred here
   * for the same reason as the admin flag and onboarding step 1: the accept
   * endpoint is auth-gated (RLS), and no session exists until the
   * confirmation email is clicked. Errors are logged, not surfaced -- a
   * SECOND accept call after a first successful one (e.g. a stale metadata
   * value on a later sign-in) 409s harmlessly, since family_invitations.status
   * flips to "accepted" on success and the endpoint rejects any non-pending
   * status; membership itself was already established by the first call.
   */
  const applyPendingInviteToken = async (user: User) => {
    const token = user.user_metadata?.pending_invite_token as
      | string
      | undefined;
    if (!token) return;

    try {
      await $fetchAuth(`/api/family/invite/${token}/accept`, {
        method: "POST",
      });
      const activeFamily = await import("~/composables/useFamilyCtx");
      await activeFamily.useFamilyCtx().refetchFamilies();
    } catch (err) {
      logger.error("Failed to apply pending invite token on sign-in", err);
    }
  };

  const ensureAccountProvisioned = async (user: User) => {
    if (suppressNextFamilyCreate) {
      suppressNextFamilyCreate = false;
    } else {
      try {
        await $fetchAuth("/api/family/create", { method: "POST" });
      } catch (err) {
        logger.error("Failed to ensure family unit on sign-in", err);
      }
    }

    await applyPendingOnboardingStep1(user);
    await applyPendingInviteToken(user);
  };

  return { ensureAccountProvisioned };
};
