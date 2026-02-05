import { requireCsrfToken } from "../utils/csrf";

/**
 * CSRF protection middleware
 * Validates CSRF tokens on all state-changing HTTP methods
 *
 * POST, PUT, PATCH, DELETE requests must include valid CSRF token
 * GET and HEAD requests are safe and don't require CSRF protection
 *
 * @example
 * // Applied globally in nuxt.config.ts
 * export default defineNuxtConfig({
 *   nitro: {
 *     middleware: ['~/server/middleware/csrf'],
 *   },
 * })
 */
export default defineEventHandler((event) => {
  const method = event.node.req.method;
  const path = event.path;

  // Only validate CSRF for state-changing methods
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!stateChangingMethods.includes(method || "")) {
    return; // GET, HEAD, OPTIONS, etc. don't need CSRF protection
  }

  // Check if CSRF validation is being skipped (e.g., for admin endpoints)
  if (event.context._skipCsrfValidation) {
    return;
  }

  // Skip CSRF for auth endpoints (they use other protections)
  // and for endpoints that don't require authentication
  if (path?.startsWith("/api/auth")) {
    return;
  }

  // Skip CSRF for public endpoints
  const publicEndpoints = [
    "/api/csrf-token", // Token generation endpoint
    "/api/health", // Health check
  ];

  // Skip CSRF for administrative utilities (diagnostic/cleanup endpoints)
  const adminEndpoints = [
    "/api/schools/", // School cascade-delete and diagnostic endpoints
    "/api/coaches/", // Coach cascade-delete and diagnostic endpoints
    "/api/interactions/", // Interaction cascade-delete and diagnostic endpoints
  ];

  if (publicEndpoints.some((endpoint) => path?.startsWith(endpoint))) {
    return;
  }

  if (
    adminEndpoints.some((endpoint) => path?.includes(endpoint)) &&
    (path?.includes("cascade-delete") || path?.includes("deletion-blockers"))
  ) {
    return;
  }

  // Validate CSRF token for protected endpoints
  requireCsrfToken(event);
});
