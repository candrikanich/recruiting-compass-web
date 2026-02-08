import { ref, readonly } from "vue";
import { useSupabase } from "~/composables/useSupabase";

export const useEmailVerification = () => {
  const supabase = useSupabase();

  const loading = ref(false);
  const error = ref<string | null>(null);
  const isVerified = ref(false);

  const withAsyncState = async <T>(
    fallbackMessage: string,
    operation: () => Promise<T>,
  ): Promise<T | null> => {
    loading.value = true;
    error.value = null;

    try {
      return await operation();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : fallbackMessage;
      console.error(`${fallbackMessage}:`, err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  const verifyEmailToken = async (token: string): Promise<boolean> => {
    if (!token || token.trim() === "") {
      loading.value = true;
      error.value = "Verification token is missing";
      loading.value = false;
      return false;
    }

    const result = await withAsyncState(
      "Email verification failed",
      async () => {
        const response = await $fetch("/api/auth/verify-email", {
          method: "POST",
          body: { token: token.trim() },
        });

        if (response && response.success) {
          isVerified.value = true;
          return true;
        }

        error.value = response?.message || "Email verification failed";
        return false;
      },
    );

    return result ?? false;
  };

  const resendVerificationEmail = async (email: string): Promise<boolean> => {
    if (!email || email.trim() === "") {
      loading.value = true;
      error.value = "Email address is required";
      loading.value = false;
      return false;
    }

    const result = await withAsyncState(
      "Failed to resend verification email",
      async () => {
        const response = await $fetch("/api/auth/resend-verification", {
          method: "POST",
          body: { email: email.trim() },
        });

        if (response && response.success) {
          return true;
        }

        error.value =
          response?.message || "Failed to resend verification email";
        return false;
      },
    );

    return result ?? false;
  };

  const checkEmailVerificationStatus = async (): Promise<boolean> => {
    const result = await withAsyncState(
      "Failed to check verification status",
      async () => {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          error.value = "Unable to verify user session";
          return false;
        }

        const verified =
          user.email_confirmed_at !== null &&
          user.email_confirmed_at !== undefined;
        isVerified.value = verified;

        return verified;
      },
    );

    return result ?? false;
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    loading: readonly(loading),
    error: readonly(error),
    isVerified: readonly(isVerified),
    verifyEmailToken,
    resendVerificationEmail,
    checkEmailVerificationStatus,
    clearError,
  };
};
