/**
 * Admin-only middleware
 * Restricts access to admin pages to users with is_admin: true
 * Waits for user store initialization to ensure session is available
 */

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Only check admin routes
  if (!to.path.startsWith("/admin")) {
    return;
  }

  const userStore = useUserStore();

  // Wait for user initialization to complete
  // This ensures the session is loaded before checking admin status
  if (userStore.loading) {
    // Wait up to 5 seconds for initialization
    let attempts = 0;
    while (userStore.loading && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
  }

  // Check if user is authenticated
  if (!userStore.isAuthenticated || !userStore.user) {
    return navigateTo("/login");
  }

  // Check if user is admin. Redirect to /login, not "/" — middleware/host.global.ts
  // forces any non-public, non-"/admin" path on the admin subdomain back to
  // "/admin", so "/" bounces straight back here, an unrecoverable redirect
  // loop for any non-admin account on the admin host. "/login" is on that
  // middleware's admin-host public-path allowlist, so it terminates.
  if (!userStore.user.is_admin) {
    return navigateTo("/login?reason=not_admin");
  }
});
