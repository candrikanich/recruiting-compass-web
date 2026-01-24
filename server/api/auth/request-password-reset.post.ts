/**
 * POST /api/auth/request-password-reset
 * Request password reset email for user account
 *
 * Handles the password reset request flow:
 * 1. User provides email address
 * 2. Backend validates email
 * 3. Supabase sends password reset email with token link
 * 4. User receives email and clicks link to reset password
 *
 * Security: Always returns success message to prevent email enumeration
 */

import { forgotPasswordSchema } from "~/utils/validation/schemas";

interface RequestPasswordResetRequest {
  email: string;
}

interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
}

export default defineEventHandler(
  async (event): Promise<RequestPasswordResetResponse> => {
    try {
      // Parse request body
      const body = await readBody<RequestPasswordResetRequest>(event);
      const { email } = body;

      // Validate email format with Zod schema
      const validationResult = forgotPasswordSchema.safeParse({ email });

      if (!validationResult.success) {
        // For security, don't reveal specific validation errors
        // Just return success to prevent email enumeration
        return {
          success: true,
          message:
            "If an account exists with this email, a password reset link will be sent shortly.",
        };
      }

      // Get Supabase credentials
      const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Missing Supabase configuration");
        throw createError({
          statusCode: 500,
          statusMessage: "Server configuration error",
        });
      }

      // Import Supabase client
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Get the application URL for redirect
      const appUrl = process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000";

      // Request password reset email from Supabase
      // Supabase will:
      // 1. Verify email exists
      // 2. Generate single-use token (24-hour expiration)
      // 3. Send email with reset link
      const { error } = await supabase.auth.resetPasswordForEmail(
        validationResult.data.email,
        {
          redirectTo: `${appUrl}/reset-password`,
        },
      );

      if (error) {
        console.error("Password reset request error:", error);

        // Check for rate limiting error
        if (
          error.message &&
          error.message.includes("over_email_send_rate_limit")
        ) {
          throw createError({
            statusCode: 429,
            statusMessage:
              "Too many password reset requests. Please wait a few minutes before trying again.",
          });
        }

        // For all other errors, return success for security
        // (don't reveal if email exists or other issues)
      }

      // Always return success message for security (prevent email enumeration)
      return {
        success: true,
        message:
          "If an account exists with this email, a password reset link will be sent shortly.",
      };
    } catch (err) {
      // If it's already a properly formatted error, re-throw it
      if (err instanceof Error && "statusCode" in err) {
        throw err;
      }

      console.error("Error in POST /api/auth/request-password-reset:", err);

      // For security, don't reveal specific errors
      return {
        success: true,
        message:
          "If an account exists with this email, a password reset link will be sent shortly.",
      };
    }
  },
);
