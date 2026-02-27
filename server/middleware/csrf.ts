import { getHeader } from "h3";
import { requireCsrfToken } from "../utils/csrf";

/**
 * CSRF protection middleware
 * Validates CSRF tokens on all state-changing HTTP methods
 *
 * POST, PUT, PATCH, DELETE requests must include valid CSRF token
 * GET and HEAD requests are safe and don't require CSRF protection
 *
 * Bearer-token requests (e.g. from iOS app) are exempt: CSRF protects against
 * cross-site requests that piggyback on cookies. Bearer tokens are in headers,
 * which same-origin policy prevents attackers from reading/setting.
 *
 * @example
 * // Applied globally in nuxt.config.ts
 * export default defineNuxtConfig({
 *   nitro: {
 *     middleware: ['~/server/middleware/csrf'],
 *   },
 * })
 */

// Exact path prefixes that are CSRF-exempt
const CSRF_EXEMPT_PREFIXES = [
  "/api/csrf-token",
  "/api/health",
  "/api/auth",
] as const;

// Exact full paths that are CSRF-exempt
const CSRF_EXEMPT_EXACT_PATHS = [
  "/api/athlete/fit-scores/recalculate-all",
] as const;

export default defineEventHandler((event) => {
  const method = event.node.req.method;
  const path = event.path;

  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!stateChangingMethods.includes(method || "")) return;

  if (CSRF_EXEMPT_PREFIXES.some((prefix) => path?.startsWith(prefix))) return;

  if (CSRF_EXEMPT_EXACT_PATHS.some((exact) => path === exact)) return;

  // Bearer-token requests (e.g. from iOS app) are exempt — CSRF doesn't apply
  const authHeader = getHeader(event, "authorization");
  if (authHeader?.startsWith("Bearer ")) return;

  requireCsrfToken(event);
});
