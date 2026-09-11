import type { User } from "@supabase/supabase-js";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useUserStore } from "~/stores/user";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useOnboarding } from "~/composables/useOnboarding";
import type { PlayerDetails } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("account-provisioning");

/**
 * Backfills server-side state that a signup couldn't set up itself because
 * Supabase withheld the session until email confirmation (prod's
 * confirm-email setting) — the family unit, an admin signup's is_admin flag
 * (pending_admin metadata, see pages/admin/signup.vue), and step-1 onboarding
 * fields drafted on the signup form itself (pending_* metadata, see
 * pages/signup.vue) so a new user doesn't re-answer them post-confirm.
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
  const userStore = useUserStore();

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

  const ensureAccountProvisioned = async (user: User) => {
    try {
      await $fetchAuth("/api/family/create", { method: "POST" });
    } catch (err) {
      logger.error("Failed to ensure family unit on sign-in", err);
    }

    if (
      user.user_metadata?.pending_admin === true &&
      !userStore.user?.is_admin
    ) {
      try {
        await $fetchAuth("/api/auth/admin-profile", {
          method: "POST",
          body: {
            fullName:
              userStore.user?.full_name ?? user.user_metadata?.full_name ?? "",
          },
        });
        await userStore.initializeUser();
      } catch (err) {
        logger.error("Failed to apply pending admin flag on sign-in", err);
      }
    }

    await applyPendingOnboardingStep1(user);
  };

  return { ensureAccountProvisioned };
};
