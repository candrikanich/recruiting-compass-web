import { setCsrfToken } from "../utils/csrf";

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
  const token = setCsrfToken(event);

  return {
    token,
  };
});
