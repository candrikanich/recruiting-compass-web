import type { SessionPreferences } from "~/types/session";
import { isProtectedRoute } from "~/types/routes";

export default defineNuxtRouteMiddleware(async (to, _from) => {
  const userStore = useUserStore();
  const config = useRuntimeConfig();

  // Check if auth enforcement is enabled via feature flag
  const authEnforcementEnabled = config.public.authEnforcementEnabled === true;

  // User is initialized from app.vue, no need to initialize here
  // This middleware handles both session timeout and route protection

  // Check session timeout on client side
  if (process.client) {
    try {
      const prefs = localStorage.getItem("session_preferences");
      if (prefs) {
        const sessionPrefs: SessionPreferences = JSON.parse(prefs);
        const now = Date.now();
        const timeSinceActivity = now - sessionPrefs.lastActivity;
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        // Session expired
        if (timeSinceActivity > thirtyDays) {
          localStorage.removeItem("session_preferences");
          await userStore.logout();

          if (to.path !== "/login") {
            return navigateTo("/login?reason=timeout");
          }
        }
      }
    } catch {
      // Silently fail if localStorage parsing fails
    }
  }

  // Auth enforcement: protect routes based on feature flag
  if (authEnforcementEnabled && isProtectedRoute(to.path)) {
    const isAuthenticated = userStore.isAuthenticated;

    if (!isAuthenticated) {
      // Redirect to login with return URL
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
    }
  }
});
