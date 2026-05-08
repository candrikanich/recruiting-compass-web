import { defineEventHandler, readBody, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";
import { createServerSupabaseClient } from "~/server/utils/supabase";

type VerifyEmailResponse = {
  success: boolean;
  message: string;
};

export default defineEventHandler(
  async (event): Promise<VerifyEmailResponse> => {
    const logger = useLogger(event, "auth/verify-email");

    const rateLimitResult = await rateLimitByIp(event, {
      requests: 10,
      window: "1 h",
    });
    throwIfRateLimited(rateLimitResult);

    try {
      const body = await readBody<{ token: string }>(event);
      const { token } = body;

      if (!token) {
        throw createError({
          statusCode: 400,
          statusMessage: "Email verification token is required",
        });
      }

      // Use anon client for OTP verification — no user context needed, Supabase validates the OTP server-side
      const supabase = createServerSupabaseClient();

      const { data, error } = await supabase.auth.verifyOtp({
        email: "",
        token: token,
        type: "email",
      });

      if (error) {
        logger.error("Email verification error", error);

        if (error.message.includes("expired")) {
          throw createError({
            statusCode: 410,
            statusMessage:
              "Verification link has expired. Please request a new one.",
          });
        }

        if (error.message.includes("invalid")) {
          throw createError({
            statusCode: 400,
            statusMessage:
              "Verification link is invalid. Please request a new one.",
          });
        }

        throw createError({
          statusCode: 400,
          statusMessage: "Email verification failed. Please try again.",
        });
      }

      if (!data.user) {
        throw createError({
          statusCode: 400,
          statusMessage: "Email verification failed. User not found.",
        });
      }

      if (data.user.email_confirmed_at) {
        logger.info("Email already verified", { userId: data.user.id });
        return {
          success: true,
          message: "Your email is already verified.",
        };
      }

      logger.info("Email verified", { userId: data.user.id });
      return {
        success: true,
        message: "Email verified successfully!",
      };
    } catch (err) {
      if (err instanceof Error && "statusCode" in err) {
        throw err;
      }

      logger.error("Error in POST /api/auth/verify-email", err);
      throw createError({
        statusCode: 500,
        statusMessage: "Email verification failed. Please try again.",
      });
    }
  },
);
