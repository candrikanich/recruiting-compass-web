import type { User } from "@supabase/supabase-js";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("account-provisioning");

/**
 * Backfills server-side state that a signup couldn't set up itself because
 * Supabase withheld the session until email confirmation (prod's
 * confirm-email setting) — the family unit, and, for admin signups, the
 * is_admin flag carried across the confirmation gap as pending_admin
 * metadata (see pages/admin/signup.vue).
 *
 * Call this on every SIGNED_IN event, not just an explicit /login form
 * submit — Supabase's own confirmation-link redirect establishes a session
 * and fires SIGNED_IN too (it lands on "/", never on /login), and that path
 * used to silently skip provisioning entirely.
 *
 * Idempotent and non-blocking: /api/family/create checks for an existing
 * family first, and a failure here must never break sign-in.
 */
export const useAccountProvisioning = () => {
  const { $fetchAuth } = useAuthFetch();
  const userStore = useUserStore();

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
  };

  return { ensureAccountProvisioned };
};
