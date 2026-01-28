import crypto from "crypto";
import type { H3Event } from "h3";
import { createError, getHeader, getCookie, setCookie } from "h3";

const CSRF_TOKEN_HEADER = "x-csrf-token";
const CSRF_COOKIE_NAME = "csrf-token";
const TOKEN_LENGTH = 32;

/**
 * Generates a cryptographically secure CSRF token.
 * Returns a 32-byte random hex string.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Sets CSRF token in response cookie and returns the token.
 * Should be called when generating a token for the client.
 */
export function setCsrfToken(event: H3Event, token?: string): string {
  const csrfToken = token || generateCsrfToken();

  setCookie(event, CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be readable by client to send in header
    secure: true, // HTTPS only in production
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return csrfToken;
}

/**
 * Validates CSRF token by comparing header token with cookie token.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function validateCsrfToken(event: H3Event): boolean {
  const headerToken = getHeader(event, CSRF_TOKEN_HEADER);
  const cookieToken = getCookie(event, CSRF_COOKIE_NAME);

  if (!headerToken || !cookieToken) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(cookieToken),
    );
  } catch {
    // Buffer.compare throws if buffers have different lengths
    return false;
  }
}

/**
 * Middleware guard to validate CSRF token.
 * Throws 403 Forbidden if token is invalid.
 * Should be used for all state-changing requests (POST, PUT, PATCH, DELETE).
 */
export function requireCsrfToken(event: H3Event): void {
  if (!validateCsrfToken(event)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Invalid CSRF token",
      message: "CSRF token validation failed",
    });
  }
}
