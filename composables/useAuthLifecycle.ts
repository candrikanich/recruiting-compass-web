/**
 * Auth-change orchestrator
 *
 * Single place both manual logout (Header/HeaderProfile) and the inactivity
 * session-timeout path route through. Ensures:
 *  1. Supabase provider sign-out always happens (previously the timeout path
 *     only cleared Pinia state, leaving a still-valid token in localStorage
 *     that silently re-authenticated the user on reload).
 *  2. Every domain store is reset, and the shared family-context singleton is
 *     cleared, so a different account logging in afterwards in the same tab
 *     never sees the previous account's schools/coaches/offers/profile or
 *     family/athlete selection.
 */
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useSchoolStore } from "~/stores/schools";
import { useCoachStore } from "~/stores/coaches";
import { useOffersStore } from "~/stores/offers";
import { usePlayerProfileStore } from "~/stores/playerProfile";
import { resetFamilyContext } from "./useFamilyContext";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useAuthLifecycle");

/**
 * Resets all domain (non-auth) client state: Pinia stores + the shared
 * family-context singleton. Idempotent — safe to call more than once (e.g.
 * once from logoutEverywhere() and again from the SIGNED_OUT auth listener
 * as a defense-in-depth backstop for any code path that calls
 * supabase.auth.signOut() directly).
 */
export function resetAppState(): void {
  try {
    useSchoolStore().reset();
    useCoachStore().reset();
    useOffersStore().reset();
    usePlayerProfileStore().reset();
  } catch (err) {
    logger.error("[resetAppState] Failed to reset one or more stores", err);
  }
  resetFamilyContext();
}

export const useAuthLifecycle = () => {
  /**
   * End the current session everywhere: Supabase provider sign-out, Pinia
   * user store, every domain store, and the family-context singleton.
   */
  const logoutEverywhere = async (): Promise<void> => {
    const supabase = useSupabase();

    try {
      // scope: "local" — "everywhere" here means every client STATE layer
      // (Pinia stores + family-context singleton), not every device. Global
      // scope would revoke the account's refresh tokens server-side for all
      // sessions, cascading "session expired" across E2E workers that share
      // one player/admin session.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        logger.error(
          "[logoutEverywhere] Supabase sign-out returned an error",
          error,
        );
      }
    } catch (err) {
      logger.error("[logoutEverywhere] Supabase sign-out threw", err);
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("session_preferences");
      localStorage.removeItem("last_activity");
    }

    useUserStore().logout();
    resetAppState();
  };

  return { logoutEverywhere };
};
