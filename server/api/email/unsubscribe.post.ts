import { defineEventHandler, getQuery, setResponseStatus } from "h3";
import { verifyUnsubscribeToken } from "~/server/utils/unsubscribeToken";
import { recordOptOut } from "~/server/utils/emailOptouts";
import { useLogger } from "~/server/utils/logger";

/**
 * RFC 8058 one-click unsubscribe. Mail clients POST to the List-Unsubscribe URL
 * with no cookies/CSRF token — the HMAC token is the authorization. This route is
 * CSRF-exempt (see server/middleware/csrf.ts).
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "email/unsubscribe");
  const query = getQuery(event);
  const email = typeof query.email === "string" ? query.email : "";
  const token = typeof query.token === "string" ? query.token : "";
  const secret = useRuntimeConfig().unsubscribeSecret;

  if (!verifyUnsubscribeToken(email, token, secret)) {
    logger.warn("Invalid one-click unsubscribe");
    setResponseStatus(event, 400);
    return { success: false };
  }

  const { error } = await recordOptOut(email);

  if (error) {
    logger.error("Failed to record one-click opt-out", error);
    setResponseStatus(event, 500);
    return { success: false };
  }

  logger.info("Recipient unsubscribed (one-click)");
  setResponseStatus(event, 202);
  return { success: true };
});
