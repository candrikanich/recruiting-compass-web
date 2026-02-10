import { ref } from "vue";
import { useSupabase } from "./useSupabase";
import type { User } from "~/types/models";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * useUsers composable
 * Manages user data fetching and caching
 */
export const useUsers = () => {
  const supabase = useSupabase();
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch a single user by ID
   */
  const getUserById = async (userId: string): Promise<User | null> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      const { data, error: fetchError } = response as {
        data: User;
        error: PostgrestError | null;
      };

      if (fetchError) {
        error.value = fetchError.message;
        return null;
      }

      return data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch user";
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch multiple users by IDs
   */
  const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await supabase
        .from("users")
        .select("*")
        .in("id", userIds);

      const { data, error: fetchError } = response as {
        data: User[];
        error: PostgrestError | null;
      };

      if (fetchError) {
        error.value = fetchError.message;
        return [];
      }

      return data || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch users";
      return [];
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    getUserById,
    getUsersByIds,
  };
};
