/**
 * Admin token validation utility
 *
 * Used to validate admin registration tokens during signup.
 * This prevents unauthorized users from creating admin accounts.
 *
 * Admin tokens are generated using ADMIN_TOKEN_SECRET environment variable.
 * Tokens use a simple HMAC-based validation scheme.
 */

import { createHmac } from "crypto";

/**
 * Validates an admin registration token
 * @param token - The token provided by the user during signup
 * @param secret - The admin token secret from runtime config
 * @returns true if token is valid, false otherwise
 */
export function validateAdminToken(token: string, secret: string): boolean {
  if (!secret) {
    console.warn(
      "adminTokenSecret not configured - admin registration tokens cannot be validated",
    );
    return false;
  }

  if (!token || typeof token !== "string") {
    return false;
  }

  // Generate expected token hash from secret
  const expectedToken = createHmac("sha256", secret)
    .update("admin-registration-token")
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  return token.length === expectedToken.length &&
    token === expectedToken;
}

/**
 * Generates an admin registration token (for documentation/admin use)
 * @param secret - The secret from ADMIN_TOKEN_SECRET env var
 * @returns The admin token to be used during signup
 */
export function generateAdminToken(secret: string): string {
  return createHmac("sha256", secret)
    .update("admin-registration-token")
    .digest("hex");
}
