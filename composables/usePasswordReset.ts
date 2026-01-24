import { ref, readonly } from "vue";

/**
 * Composable for password reset operations
 *
 * Manages password reset flow:
 * - Requesting password reset (forgot password email)
 * - Confirming new password with reset token
 * - Handling reset token validation and expiration
 *
 * Calls Supabase Auth directly for MVP (no backend endpoint)
 *
 * @example
 * const { requestPasswordReset, confirmPasswordReset } = usePasswordReset()
 * const success = await requestPasswordReset('user@example.com')
 * const confirmed = await confirmPasswordReset('NewPassword123')
 *
 * @returns Object with password reset actions and readonly state
 */

export const usePasswordReset = () => {
  // State
  const loading = ref(false);
  const error = ref<string | null>(null);
  const emailSent = ref(false);
  const passwordUpdated = ref(false);

  /**
   * Request password reset email
   * Calls Supabase Auth to send reset link to user email
   */
  const requestPasswordReset = async (email: string): Promise<boolean> => {
    loading.value = true;
    error.value = null;
    emailSent.value = false;

    try {
      if (!email || email.trim() === "") {
        error.value = "Email address is required";
        return false;
      }

      const supabase = useSupabase();
      const appUrl = useRuntimeConfig().public.supabaseUrl
        ? location.origin
        : "http://localhost:3000";

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${appUrl}/reset-password`,
        },
      );

      if (resetError) {
        error.value = resetError.message || "Failed to request password reset";
        console.error("Password reset request error:", resetError);
        return false;
      }

      emailSent.value = true;
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to request password reset";
      error.value = message;
      console.error("Password reset request error:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Confirm password reset with new password
   * Calls Supabase Auth to update user password
   * Requires valid reset token (from URL hash)
   */
  const confirmPasswordReset = async (password: string): Promise<boolean> => {
    loading.value = true;
    error.value = null;
    passwordUpdated.value = false;

    try {
      if (!password || password.trim() === "") {
        error.value = "Password is required";
        return false;
      }

      const supabase = useSupabase();

      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (updateError) {
        error.value = updateError.message || "Failed to reset password";
        console.error("Password reset confirmation error:", updateError);
        return false;
      }

      passwordUpdated.value = true;
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reset password";
      error.value = message;
      console.error("Password reset confirmation error:", err);
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
    emailSent: readonly(emailSent),
    passwordUpdated: readonly(passwordUpdated),

    // Password reset actions
    requestPasswordReset,
    confirmPasswordReset,
    clearError,
  };
};
