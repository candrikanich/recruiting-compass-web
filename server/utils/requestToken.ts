import { createError, getCookie, getHeader, type H3Event } from "h3";

/**
 * Extracts the raw Supabase access token from a request — Authorization
 * Bearer header first, falling back to the `sb-access-token` cookie. Used by
 * endpoints that need the token string to build an RLS-scoped user client
 * (typically after `requireAuth` has already verified the caller).
 *
 * Throws 401 when no token is present.
 */
export function extractRequestToken(event: H3Event): string {
  const authHeader = getHeader(event, "authorization");
  const token: string | null = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : getCookie(event, "sb-access-token") || null;
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized - no authentication token",
    });
  }
  return token;
}
