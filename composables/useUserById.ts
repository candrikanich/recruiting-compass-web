import { ref, computed, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import type { User } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useUserById");

/**
 * useUserById composable
 * Fetches a single user by ID from Supabase
 *
 * Usage:
 * ```ts
 * const { user, loading, fetchUser } = useUserById(userId)
 * onMounted(() => fetchUser())
 * ```
 */
export const useUserById = (userId: string) => {
  const supabase = useSupabase();
  const user = ref<User | null>(null);
  const loadingRef = ref(false);
  const errorRef = ref<string | null>(null);

  const loading = computed(() => loadingRef.value) as ComputedRef<boolean>;
  const error = computed(() => errorRef.value) as ComputedRef<string | null>;

  const fetchUser = async (): Promise<void> => {
    if (!userId) {
      errorRef.value = "No user ID provided";
      return;
    }

    loadingRef.value = true;
    errorRef.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError) {
        logger.debug("User not found or fetch error", { userId, code: fetchError.code });
        errorRef.value = null; // Silently handle not found
        return;
      }

      user.value = data as User;
    } catch (err) {
      logger.error("Unexpected error fetching user", err);
      errorRef.value = "Failed to load user";
    } finally {
      loadingRef.value = false;
    }
  };

  return {
    user,
    loading,
    error,
    fetchUser,
  };
};
