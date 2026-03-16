import { defineEventHandler, createError } from "h3";
import { setCsrfToken } from "../utils/csrf";
import { useLogger } from "~/server/utils/logger";

/**
 * GET /api/csrf-token
 *
 * Returns a CSRF token to the client.
 * The token is set in a secure httpOnly cookie and should be
 * sent back in the 'x-csrf-token' header for state-changing requests.
 *
 * @returns { token: string } CSRF token for client use
 */
export default defineEventHandler((event) => {
  const logger = useLogger(event, "csrf-token");
  try {
    const token = setCsrfToken(event);
    logger.debug("CSRF token issued");
    return {
      token,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to issue CSRF token", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to generate CSRF token",
    });
  }
});
