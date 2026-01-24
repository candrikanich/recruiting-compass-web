import { ref, readonly } from "vue";

/**
 * Composable for password reset operations
 *
 * Manages password reset flow:
 * - Requesting password reset (forgot password email)
 * - Confirming new password with reset token
 * - Handling reset token validation and expiration
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
   * Calls backend endpoint to send reset link to user email
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

      const response = await $fetch("/api/auth/request-password-reset", {
        method: "POST",
        body: {
          email: email.trim(),
        },
      });

      if (response && response.success) {
        emailSent.value = true;
        return true;
      }

      error.value =
        response?.message || "Failed to request password reset";
      return false;
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
   * Calls backend endpoint to update user password
   * Requires valid reset token (from URL or session)
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

      const response = await $fetch("/api/auth/confirm-password-reset", {
        method: "POST",
        body: {
          password: password.trim(),
        },
      });

      if (response && response.success) {
        passwordUpdated.value = true;
        return true;
      }

      error.value =
        response?.message || "Failed to reset password";
      return false;
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
