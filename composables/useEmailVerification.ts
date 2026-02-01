import { ref, readonly } from "vue";
import { useSupabase } from "~/composables/useSupabase";

/**
 * Composable for email verification operations
 *
 * Manages email verification flow:
 * - Verifying tokens from confirmation email links
 * - Resending verification emails
 * - Checking verification status
 *
 * @example
 * const { verifyEmailToken, resendVerificationEmail } = useEmailVerification()
 * const success = await verifyEmailToken(token)
 * const sent = await resendVerificationEmail('user@example.com')
 *
 * @returns Object with verification actions and readonly state
 */

export const useEmailVerification = () => {
  const supabase = useSupabase();

  // State
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isVerified = ref(false);

  /**
   * Verify email token from confirmation link
   * Calls backend endpoint to verify with Supabase
   */
  const verifyEmailToken = async (token: string): Promise<boolean> => {
    loading.value = true;
    error.value = null;

    try {
      if (!token || token.trim() === "") {
        error.value = "Verification token is missing";
        return false;
      }

      const response = await $fetch("/api/auth/verify-email", {
        method: "POST",
        body: {
          token: token.trim(),
        },
      });

      if (response && response.success) {
        isVerified.value = true;
        return true;
      }

      error.value = response?.message || "Email verification failed";
      return false;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Email verification failed";
      error.value = message;
      console.error("Email verification error:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Resend verification email to user
   * Calls backend endpoint which uses Supabase admin API
   */
  const resendVerificationEmail = async (email: string): Promise<boolean> => {
    loading.value = true;
    error.value = null;

    try {
      if (!email || email.trim() === "") {
        error.value = "Email address is required";
        return false;
      }

      const response = await $fetch("/api/auth/resend-verification", {
        method: "POST",
        body: {
          email: email.trim(),
        },
      });

      if (response && response.success) {
        return true;
      }

      error.value = response?.message || "Failed to resend verification email";
      return false;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to resend verification email";
      error.value = message;
      console.error("Resend verification error:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Check email verification status for current user
   * Fetches user session and checks email_confirmed_at
   */
  const checkEmailVerificationStatus = async (): Promise<boolean> => {
    loading.value = true;
    error.value = null;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        error.value = "Unable to verify user session";
        return false;
      }

      // Check if email_confirmed_at is set (indicates verified)
      const verified =
        user.email_confirmed_at !== null &&
        user.email_confirmed_at !== undefined;
      isVerified.value = verified;

      return verified;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to check verification status";
      error.value = message;
      console.error("Verification status check error:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Clear error state
   * Useful for dismissing error messages in UI
   */
  const clearError = () => {
    error.value = null;
  };

  return {
    // Readonly state
    loading: readonly(loading),
    error: readonly(error),
    isVerified: readonly(isVerified),

    // Email verification actions
    verifyEmailToken,
    resendVerificationEmail,
    checkEmailVerificationStatus,
    clearError,
  };
};
