/**
 * POST /api/auth/verify-email
 * Verify email confirmation token from Supabase email link
 *
 * Handles the email verification flow:
 * 1. User receives email with verification link containing token_hash
 * 2. Frontend extracts token from query params and calls this endpoint
 * 3. Endpoint verifies the token with Supabase
 * 4. Sets email_confirmed_at if successful
 */

interface VerifyEmailRequest {
  token: string;
}

interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

export default defineEventHandler(async (event): Promise<VerifyEmailResponse> => {
  try {
    // Parse request body
    const body = await readBody<VerifyEmailRequest>(event);
    const { token } = body;

    // Validate token is provided
    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: "Email verification token is required",
      });
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

    // Import Supabase client for auth operations
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verify email using Supabase auth API
    // The token from email link is passed to verifyOtp with type 'email'
    const { data, error } = await supabase.auth.verifyOtp({
      email: "", // Email not needed for token verification
      token: token,
      type: "email",
    });

    if (error) {
      console.error("Email verification error:", error);

      // Provide user-friendly error messages
      if (error.message.includes("expired")) {
        throw createError({
          statusCode: 410,
          statusMessage: "Verification link has expired. Please request a new one.",
        });
      }

      if (error.message.includes("invalid")) {
        throw createError({
          statusCode: 400,
          statusMessage: "Verification link is invalid. Please request a new one.",
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

    // Check if email is already confirmed
    if (data.user.email_confirmed_at) {
      return {
        success: true,
        message: "Your email is already verified.",
      };
    }

    return {
      success: true,
      message: "Email verified successfully!",
    };
  } catch (err) {
    // If it's already a properly formatted error, re-throw it
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    console.error("Error in POST /api/auth/verify-email:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Email verification failed. Please try again.",
    });
  }
});
