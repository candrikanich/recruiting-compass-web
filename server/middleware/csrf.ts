import { getHeader, getCookie } from "h3";
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
export const CSRF_EXEMPT_PREFIXES = [
  "/api/csrf-token",
  "/api/health",
  "/api/auth",
] as const;

// Exact full paths that are CSRF-exempt
export const CSRF_EXEMPT_EXACT_PATHS = [
  "/api/athlete/fit-scores/recalculate-all",
  // RFC 8058 one-click unsubscribe: mail clients POST with no cookies/CSRF token.
  // The HMAC unsubscribe token is the authorization.
  "/api/email/unsubscribe",
] as const;

/** HTTP methods CSRF protection applies to; GET/HEAD are safe and exempt. */
export const CSRF_STATE_CHANGING_METHODS = [
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
] as const;

/**
 * True when `path` matches one of the exempt prefixes or exact paths.
 * Exported so tests assert against the SAME predicate the middleware runs,
 * instead of a hand-copied reimplementation that can silently drift from
 * this file (planning/audit-2026-07-27-findings.md, "6. Testing").
 */
export function isCsrfExemptPath(path: string | undefined): boolean {
  if (!path) return false;
  if (CSRF_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return true;
  }
  return CSRF_EXEMPT_EXACT_PATHS.some((exact) => path === exact);
}

/**
 * True only for a cookie-less Bearer request (the native iOS app). Web
 * browsers send both a Bearer token (injected by useAuthFetch) and the
 * sb-access-token cookie set by the Supabase SDK, so they still require
 * CSRF validation — only the Bearer-without-cookie combination uniquely
 * identifies a native client where CSRF doesn't apply.
 */
export function isBearerOnlyRequest(
  authHeader: string | undefined,
  sbAccessTokenCookie: string | undefined,
): boolean {
  return Boolean(
    authHeader?.trimStart().startsWith("Bearer ") && !sbAccessTokenCookie,
  );
}

export default defineEventHandler((event) => {
  const method = event.node.req.method;
  const path = event.path;

  if (!CSRF_STATE_CHANGING_METHODS.includes(method as never)) return;

  if (isCsrfExemptPath(path)) return;

  const authHeader =
    getHeader(event, "authorization") ??
    (event.node.req.headers["authorization"] as string | undefined) ??
    (event.node.req.headers["Authorization"] as string | undefined);
  if (isBearerOnlyRequest(authHeader, getCookie(event, "sb-access-token"))) {
    return;
  }

  requireCsrfToken(event);
});
