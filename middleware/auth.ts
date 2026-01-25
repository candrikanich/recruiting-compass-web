import type { SessionPreferences } from "~/types/session";

export default defineNuxtRouteMiddleware(async (to, _from) => {
  const userStore = useUserStore();

  // User is initialized from app.vue, no need to initialize here
  // This middleware now only handles session timeout

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

  // For now, allow all access (no auth guards yet)
  // This will be updated later to protect routes
});
