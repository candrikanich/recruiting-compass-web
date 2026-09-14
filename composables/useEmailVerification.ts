import { ref, readonly } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useEmailVerification");

export const useEmailVerification = () => {
  const supabase = useSupabase();
  const { $fetchAuth } = useAuthFetch();

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
      logger.error(`${fallbackMessage}:`, err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  const resendVerificationEmail = async (): Promise<boolean> => {
    const result = await withAsyncState(
      "Failed to resend verification email",
      async () => {
        // /api/auth/verify-email/resend is requireAuth-gated and this app sets
        // no auth cookie — a bare $fetch would 401 on every real browser call.
        const response = await $fetchAuth<{ success?: boolean }>(
          "/api/auth/verify-email/resend",
          { method: "POST" },
        );

        if (response && response.success) {
          return true;
        }

        error.value = "Failed to resend verification email";
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

        // No session is the normal state for a brand-new signup awaiting
        // email confirmation (auth.signUp() withholds the session until the
        // link is clicked). supabase-js's getUser() surfaces this as
        // AuthSessionMissingError, not a plain {user: null, error: null} —
        // it never makes a network call when there's no session locally.
        // Only a genuine authError (network, malformed token, etc.) is
        // worth surfacing to the user.
        const isNoSessionError =
          authError?.name === "AuthSessionMissingError" ||
          authError?.message?.toLowerCase().includes("session missing");

        if (authError && !isNoSessionError) {
          error.value = "Unable to verify user session";
          return false;
        }

        if (!user) {
          return false;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("email_verified_at")
          .eq("id", user.id)
          .maybeSingle();

        const verified = profile?.email_verified_at != null;
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
    resendVerificationEmail,
    checkEmailVerificationStatus,
    clearError,
  };
};
