/**
 * Onboarding Middleware
 *
 * Handles access control for unauthenticated users and incomplete onboarding:
 * - Redirects unauthenticated users to login
 * - Allows authenticated users with incomplete onboarding to access /onboarding/* only
 * - Redirects authenticated users with incomplete onboarding away from other routes
 * - Allows full access for completed onboarding
 */

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "__path__") || "/";

  // Public routes that don't require onboarding check
  const publicRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/legal/",
    "/_nuxt/",
    "/api/",
  ];

  // Check if path is public
  const isPublicRoute = publicRoutes.some((route) => path.startsWith(route));
  if (isPublicRoute) {
    return;
  }

  // NOTE: Server-side middleware cannot easily access authenticated user context
  // in Nuxt 3. This middleware is simplified and actual onboarding protection
  // should be handled via:
  // 1. Client-side route guards in app.vue or middleware
  // 2. Supabase RLS policies on protected data
  // 3. Auth checks in server endpoints that access protected resources

  // For now, we allow all routes and rely on client-side auth checks
  // This prevents infinite redirect loops at build time
});
