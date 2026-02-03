/**
 * POST /api/auth/confirm-password-reset
 * Confirm password reset with new password
 *
 * Handles password reset confirmation flow:
 * 1. User received reset email with token
 * 2. User navigates to reset page with token in URL
 * 3. User enters new password
 * 4. Backend updates password with Supabase
 * 5. Supabase handles token validation and 24-hour expiration
 *
 * Security:
 * - Supabase enforces token expiration (24 hours)
 * - Single-use token (cannot be reused)
 * - Password strength requirements enforced
 */

import { resetPasswordSchema } from "~/utils/validation/schemas";

interface ConfirmPasswordResetRequest {
  password: string;
}

interface ConfirmPasswordResetResponse {
  success: boolean;
  message: string;
}

export default defineEventHandler(
  async (event): Promise<ConfirmPasswordResetResponse> => {
    try {
      // Get current user session - Supabase sets auth token in session
      // when user clicks reset link in email
      const {
        data: { session },
        error: sessionError,
      } = await event.context.supabase.auth.getSession();

      if (sessionError || !session) {
        throw createError({
          statusCode: 401,
          statusMessage:
            "Invalid or expired reset link. Please request a new password reset.",
        });
      }

      // Parse request body
      const body = await readBody<ConfirmPasswordResetRequest>(event);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { password } = body;

      // Validate password with Zod schema
      const validationResult = resetPasswordSchema.safeParse({
        password,
        confirmPassword: password,
      });

      if (!validationResult.success) {
        // Extract first validation error for user feedback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errors = (validationResult.error as any).errors as Array<{
          message: string;
        }>;
        const message =
          errors[0]?.message || "Password does not meet requirements";

        throw createError({
          statusCode: 400,
          statusMessage: message,
        });
      }

      // Update user password with Supabase
      // This requires valid session from reset link
      const { error: updateError } =
        await event.context.supabase.auth.updateUser({
          password: validationResult.data.password,
        });

      if (updateError) {
        console.error("Password update error:", updateError);

        // Provide specific error messages
        if (
          updateError.message &&
          updateError.message.includes("invalid") &&
          updateError.message.includes("token")
        ) {
          throw createError({
            statusCode: 401,
            statusMessage:
              "Invalid or expired reset link. Please request a new password reset.",
          });
        }

        if (updateError.message && updateError.message.includes("expired")) {
          throw createError({
            statusCode: 410,
            statusMessage:
              "Reset link has expired. Please request a new password reset.",
          });
        }

        throw createError({
          statusCode: 400,
          statusMessage: "Failed to reset password. Please try again.",
        });
      }

      return {
        success: true,
        message:
          "Password has been reset successfully. You can now log in with your new password.",
      };
    } catch (err) {
      // If it's already a properly formatted error, re-throw it
      if (err instanceof Error && "statusCode" in err) {
        throw err;
      }

      console.error("Error in POST /api/auth/confirm-password-reset:", err);

      throw createError({
        statusCode: 500,
        statusMessage: "Failed to reset password. Please try again.",
      });
    }
  },
);
