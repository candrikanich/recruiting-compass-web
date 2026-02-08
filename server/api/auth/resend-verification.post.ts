import { createServerSupabaseClient } from "~/server/utils/supabase";

type ResendVerificationResponse = {
  success: boolean;
  message: string;
};

export default defineEventHandler(
  async (event): Promise<ResendVerificationResponse> => {
    try {
      const body = await readBody<{ email: string }>(event);
      const { email } = body;

      if (!email) {
        throw createError({
          statusCode: 400,
          statusMessage: "Email address is required",
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid email address format",
        });
      }

      const supabaseAdmin = createServerSupabaseClient();

      const { data: userData, error: userError } =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabaseAdmin.auth.admin as any).listUsersByFilter({
          filter: `email=${email}`,
        });

      if (userError || !userData.users || userData.users.length === 0) {
        return {
          success: true,
          message:
            "If an account exists with this email, a verification email will be sent shortly.",
        };
      }

      const user = userData.users[0];

      if (user.email_confirmed_at) {
        return {
          success: true,
          message: "Your email is already verified.",
        };
      }

      const { error: resendError } =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabaseAdmin.auth.admin as any).generateLink({
          type: "magiclink",
          email: email,
        });

      if (resendError) {
        console.error("Error resending verification email:", resendError);

        if (
          resendError.message &&
          resendError.message.includes("over_email_send_rate_limit")
        ) {
          throw createError({
            statusCode: 429,
            statusMessage:
              "Too many verification requests. Please wait a few minutes before trying again.",
          });
        }

        throw createError({
          statusCode: 400,
          statusMessage:
            "Unable to send verification email. Please try again later.",
        });
      }

      return {
        success: true,
        message: "Verification email sent successfully.",
      };
    } catch (err) {
      if (err instanceof Error && "statusCode" in err) {
        throw err;
      }

      console.error("Error in POST /api/auth/resend-verification:", err);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to resend verification email. Please try again.",
      });
    }
  },
);
