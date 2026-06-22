import { defineEventHandler, getQuery, setResponseStatus } from "h3";
import { verifyUnsubscribeToken } from "~/server/utils/unsubscribeToken";
import { recordOptOut } from "~/server/utils/emailOptouts";
import { useLogger } from "~/server/utils/logger";

/**
 * Human-facing unsubscribe (clicked from an email footer link).
 * No auth: the recipient is unauthenticated; the HMAC token authorizes the opt-out.
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "email/unsubscribe");
  const query = getQuery(event);
  const email = typeof query.email === "string" ? query.email : "";
  const token = typeof query.token === "string" ? query.token : "";
  const secret = useRuntimeConfig().unsubscribeSecret;

  if (!verifyUnsubscribeToken(email, token, secret)) {
    logger.warn("Invalid unsubscribe link");
    setResponseStatus(event, 400);
    return renderPage(
      "Invalid link",
      "This unsubscribe link is invalid or has expired.",
    );
  }

  const { error } = await recordOptOut(email);

  if (error) {
    logger.error("Failed to record opt-out", error);
    setResponseStatus(event, 500);
    return renderPage(
      "Something went wrong",
      "We couldn't process your request. Please try again later.",
    );
  }

  logger.info("Recipient unsubscribed");
  return renderPage(
    "You've been unsubscribed",
    "You will no longer receive recurring emails from The Recruiting Compass.",
  );
});

function renderPage(title: string, message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1e293b"><h1 style="font-size:1.25rem">${title}</h1><p>${message}</p></body></html>`;
}
