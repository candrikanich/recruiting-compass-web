import type { SessionPreferences } from "~/types/session";
import { isProtectedRoute } from "~/types/routes";

export default defineNuxtRouteMiddleware(async (to, _from) => {
  const userStore = useUserStore();

  // Check session timeout on client side
  if (process.client) {
    try {
      const prefs = localStorage.getItem("session_preferences");
      if (prefs) {
        const sessionPrefs: SessionPreferences = JSON.parse(prefs);

        // Honor the expiry stored at login (1 day normally, 30 days when
        // "remember me" was checked) instead of a hardcoded 30-day window —
        // previously a non-remember-me ("1 day") session lasted 30 days
        // because expiresAt was written but never read back here.
        const expiresAt = sessionPrefs.expiresAt;
        const isExpired =
          typeof expiresAt !== "number" || Date.now() > expiresAt;

        if (isExpired) {
          localStorage.removeItem("session_preferences");
          const { useAuthLifecycle } = await import(
            "~/composables/useAuthLifecycle"
          );
          await useAuthLifecycle().logoutEverywhere();

          if (to.path !== "/login") {
            return navigateTo("/login?reason=timeout");
          }
        }
      }
    } catch {
      localStorage.removeItem("session_preferences");
    }
  }

  // Route protection — always enforced
  if (isProtectedRoute(to.path)) {
    const isAuthenticated = userStore.isAuthenticated;

    if (!isAuthenticated) {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
    }
  }
});
