/**
 * POST /api/auth/resend-verification
 * Resend email verification email to user
 *
 * Handles resending verification emails:
 * 1. User requests new verification email (rate-limited)
 * 2. Supabase sends new verification email with new token
 * 3. Response indicates success or provides error reason
 */

interface ResendVerificationRequest {
  email: string;
}

interface ResendVerificationResponse {
  success: boolean;
  message: string;
}

export default defineEventHandler(
  async (event): Promise<ResendVerificationResponse> => {
    try {
      // Parse request body
      const body = await readBody<ResendVerificationRequest>(event);
      const { email } = body;

      // Validate email is provided
      if (!email) {
        throw createError({
          statusCode: 400,
          statusMessage: "Email address is required",
        });
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid email address format",
        });
      }

      // Get Supabase credentials
      const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        console.error("Missing Supabase configuration");
        throw createError({
          statusCode: 500,
           
          statusMessage: "Server configuration error",
        });
      }

      // Import Supabase client
      const { createClient } = await import("@supabase/supabase-js");

      // Use service role key to access admin auth API for resending
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // Resend verification email via admin API
      // Using Magic Link approach instead of email_change_current
      const { data: userData, error: userError } =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabaseAdmin.auth.admin as any).listUsersByFilter({
          filter: `email=${email}`,
        });

      if (userError || !userData.users || userData.users.length === 0) {
        // For security, don't reveal if email exists
        // Just indicate that if user exists, email will be sent
        return {
          success: true,
          message:
            "If an account exists with this email, a verification email will be sent shortly.",
        };
      }

      const user = userData.users[0];

      // Check if email is already verified
      if (user.email_confirmed_at) {
        return {
          success: true,
          message: "Your email is already verified.",
        };
      }

      // Resend confirmation email via admin API using generateLink with correct params
      const { error: resendError } =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabaseAdmin.auth.admin as any).generateLink({
          type: "magiclink",
          email: email,
        });

      if (resendError) {
        console.error("Error resending verification email:", resendError);

        // Check for rate limiting
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
      // If it's already a properly formatted error, re-throw it
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
