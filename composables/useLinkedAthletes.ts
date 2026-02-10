import { ref } from "vue";
import type { Ref } from "vue";
import { useSupabase } from "./useSupabase";
import type { User } from "~/types/models";

/**
 * useLinkedAthletes composable
 *
 * Fetches and manages linked athlete accounts for parent users.
 * Handles the multi-step account linking process where parents can view
 * interactions and data for linked student athletes.
 *
 * Example:
 * ```typescript
 * const { linkedAthletes, loading, error, fetchLinkedAthletes } = useLinkedAthletes();
 *
 * onMounted(async () => {
 *   await fetchLinkedAthletes(userStore.user.id);
 * });
 *
 * return { linkedAthletes, loading, error };
 * ```
 */
export const useLinkedAthletes = (): {
  linkedAthletes: Ref<User[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchLinkedAthletes: (parentUserId: string) => Promise<void>;
} => {
  const supabase = useSupabase();

  const linkedAthletes = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch all linked athletes for a given parent user ID
   *
   * Process:
   * 1. Query account_links table for all linked athlete IDs
   * 2. Extract athlete IDs from results
   * 3. Fetch full user records for each athlete
   * 4. Populate linkedAthletes ref
   *
   * Handles edge cases:
   * - No account links exist (graceful empty array)
   * - Link records have null player_user_id (filtered out)
   * - User fetch fails (error state set)
   */
  const fetchLinkedAthletes = async (parentUserId: string): Promise<void> => {
    if (!parentUserId) {
      error.value = "Parent user ID is required";
      return;
    }

    loading.value = true;
    error.value = null;

    type SupabaseError = { message?: string; code?: string } | null;

    try {
      // Step 1: Fetch account links for this parent
      const { data: accountLinks, error: linksError } = (await supabase
        .from("account_links")
        .select("player_user_id")
        .eq("parent_user_id", parentUserId)) as {
        data: Array<{ player_user_id: string | null }> | null;
        error: SupabaseError;
      };

      if (linksError) {
        throw linksError;
      }

      // Step 2: Extract and filter athlete IDs
      if (!accountLinks || accountLinks.length === 0) {
        linkedAthletes.value = [];
        return;
      }

      const athleteIds = accountLinks
        .map((link) => link.player_user_id)
        .filter((id): id is string => id !== null);

      if (athleteIds.length === 0) {
        linkedAthletes.value = [];
        return;
      }

      // Step 3: Fetch full user records
      const { data: athletes, error: athletesError } = await supabase
        .from("users")
        .select("*")
        .in("id", athleteIds);

      if (athletesError) {
        throw athletesError;
      }

      // Step 4: Populate results
      linkedAthletes.value = (athletes as User[]) || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch linked athletes";
      linkedAthletes.value = [];
    } finally {
      loading.value = false;
    }
  };

  return {
    linkedAthletes,
    loading,
    error,
    fetchLinkedAthletes,
  };
};
