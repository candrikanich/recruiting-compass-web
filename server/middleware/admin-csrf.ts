/**
 * Middleware to disable CSRF protection for admin endpoints
 * Admin endpoints are protected by auth + admin checks, so CSRF is redundant
 */

export default defineEventHandler((event) => {
  const url = event.node.req.url || "";

  // Disable CSRF for admin API endpoints
  if (url.startsWith("/api/admin/")) {
    // Set a flag that tells h3-csrf to skip validation
    event.context._skipCsrfValidation = true;
  }
});
