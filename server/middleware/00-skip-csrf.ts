/**
 * Middleware to disable CSRF protection for admin and auth-protected endpoints
 * These endpoints are protected by authentication checks, so CSRF is redundant
 */

export default defineEventHandler((event) => {
  const url = event.node.req.url || "";

  // Disable CSRF for admin API endpoints (protected by admin checks)
  if (url.startsWith("/api/admin/")) {
    event.context._skipCsrfValidation = true;
  }

  // Disable CSRF for family code endpoints (protected by requireAuth)
  if (url.startsWith("/api/family/code/")) {
    event.context._skipCsrfValidation = true;
  }
});
