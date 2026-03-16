import { ref, computed, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import type { User } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useAthleteProfile");

/**
 * useAthleteProfile composable
 * Fetches athlete profile data from Supabase
 *
 * Usage:
 * ```ts
 * const { athlete, loading, error, fetchAthleteProfile } = useAthleteProfile(athleteId)
 * onMounted(() => fetchAthleteProfile())
 * ```
 */
export const useAthleteProfile = (athleteId: string) => {
  const supabase = useSupabase();
  const athlete = ref<User | null>(null);
  const loadingRef = ref(false);
  const errorRef = ref<string | null>(null);

  const loading = computed(() => loadingRef.value) as ComputedRef<boolean>;
  const error = computed(() => errorRef.value) as ComputedRef<string | null>;

  const fetchAthleteProfile = async (): Promise<void> => {
    if (!athleteId) {
      errorRef.value = "No athlete ID provided";
      return;
    }

    loadingRef.value = true;
    errorRef.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", athleteId)
        .single();

      if (fetchError) {
        logger.error("Error fetching athlete profile", fetchError);
        errorRef.value = "Failed to load athlete profile";
        return;
      }

      athlete.value = data as User;
    } catch (err) {
      logger.error("Unexpected error fetching athlete profile", err);
      errorRef.value = "Unexpected error loading athlete profile";
    } finally {
      loadingRef.value = false;
    }
  };

  return {
    athlete,
    loading,
    error,
    fetchAthleteProfile,
  };
};
