import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";
import { consumeVerificationToken } from "~/server/utils/emailVerificationTokens";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/verify-email");

  // Unauthenticated and token-guessable — cap attempts per IP the same way
  // signup does.
  throwIfRateLimited(
    await rateLimitByIp(event, { requests: 10, window: "1 h" }),
  );

  const token = getRouterParam(event, "token");

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Token is required" });
  }

  const result = await consumeVerificationToken(token);

  if (result.status === "not_found") {
    throw createError({
      statusCode: 404,
      statusMessage: "Verification link is invalid. Please request a new one.",
    });
  }

  if (result.status === "expired") {
    throw createError({
      statusCode: 410,
      statusMessage: "Verification link has expired. Please request a new one.",
    });
  }

  if (result.status === "invalidated") {
    throw createError({
      statusCode: 410,
      statusMessage:
        "This link is no longer valid — a newer verification email was sent. Please use that one.",
    });
  }

  logger.info("Email verification result", {
    status: result.status,
    userId: result.userId,
  });
  return { status: result.status };
});
