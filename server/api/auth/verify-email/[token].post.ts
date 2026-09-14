import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { consumeVerificationToken } from "~/server/utils/emailVerificationTokens";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/verify-email");
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

  logger.info("Email verification result", { status: result.status, userId: result.userId });
  return { status: result.status };
});
