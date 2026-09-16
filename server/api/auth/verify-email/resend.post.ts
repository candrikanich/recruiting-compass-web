import { defineEventHandler, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit";
import {
  issueVerificationToken,
  invalidateOutstandingTokens,
  discardVerificationToken,
} from "~/server/utils/emailVerificationTokens";
import { sendVerificationEmail } from "~/server/utils/emailService";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/verify-email/resend");
  const user = await requireAuth(event);

  const rateLimitResult = await rateLimitByUser(event, user.id, {
    requests: 5,
    window: "1 h",
  });
  throwIfRateLimited(rateLimitResult);

  // Don't kill the prior token until the new one is actually delivered —
  // otherwise a send failure strands the user with no valid link.
  const { token } = await issueVerificationToken(user.id, {
    invalidatePrior: false,
  });
  const result = await sendVerificationEmail({ to: user.email ?? "", token });

  if (!result.success) {
    logger.error("Resend verification email failed", result.error);
    await discardVerificationToken(token);
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to send verification email. Please try again.",
    });
  }

  await invalidateOutstandingTokens(user.id, token);

  return { success: true };
});
