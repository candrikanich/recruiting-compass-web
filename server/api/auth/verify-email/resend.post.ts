import { defineEventHandler } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit";
import { issueVerificationToken } from "~/server/utils/emailVerificationTokens";
import { sendVerificationEmail } from "~/server/utils/emailService";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/verify-email/resend");
  const user = await requireAuth(event);

  const rateLimitResult = await rateLimitByUser(event, user.id, {
    requests: 5,
    window: "1 h",
  });
  throwIfRateLimited(rateLimitResult);

  const { token } = await issueVerificationToken(user.id);
  const result = await sendVerificationEmail({ to: user.email ?? "", token });

  if (!result.success) {
    logger.error("Resend verification email failed", result.error);
  }

  return { success: true };
});
