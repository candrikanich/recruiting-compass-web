import { ref, computed } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { SavedSearch, SearchHistory } from "~/types/models";

// Type aliases for Supabase casting (tables not yet in database.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SavedSearchInsert = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _SavedSearchUpdate = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _SearchHistoryInsert = any;

/**
 * useSavedSearches composable
 * Manages saved searches and search history for quick access to frequently used searches
 */
export const useSavedSearches = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  // State
  const savedSearches = ref<SavedSearch[]>([]);
  const searchHistory = ref<SearchHistory[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const favoritedSearches = computed(() => {
    return savedSearches.value
      .filter((s) => s.is_favorite)
      .sort((a, b) => b.use_count - a.use_count);
  });

  const recentSearches = computed(() => {
    return searchHistory.value
      .sort(
        (a, b) =>
          new Date(b.searched_at).getTime() - new Date(a.searched_at).getTime(),
      )
      .slice(0, 10);
  });

  // Load saved searches
  const loadSavedSearches = async () => {
    if (!userStore.user) return;

    isLoading.value = true;
    error.value = null;

    try {
      const savedSearchResponse = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", userStore.user.id)
        .order("updated_at", { ascending: false });

      const { data, error: err } = savedSearchResponse as {
        data: SavedSearch[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (err) throw err;
      savedSearches.value = data || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load saved searches";
      console.error("Load saved searches error:", err);
    } finally {
      isLoading.value = false;
    }
  };

  // Load search history
  const loadSearchHistory = async () => {
    if (!userStore.user) return;

    isLoading.value = true;
    error.value = null;

    try {
      const historyResponse = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", userStore.user.id)
        .order("searched_at", { ascending: false })
        .limit(50);

      const { data, error: err } = historyResponse as {
        data: SearchHistory[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (err) throw err;
      searchHistory.value = data || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load search history";
      console.error("Load search history error:", err);
    } finally {
      isLoading.value = false;
    }
  };

  // Save a search
  const saveSearch = async (
    name: string,
    query: string,
    searchType: SavedSearch["searchType"],
    filters: SavedSearch["filters"],
    _description?: string,
  ): Promise<SavedSearch | null> => {
    if (!userStore.user) return null;

    error.value = null;

    try {
      const newSearch: SavedSearchInsert = {
        user_id: userStore.user.id,
        name,
        filters: {
          ...filters,
          search_term: query,
        },
        is_default: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const saveResponse = await (supabase.from("saved_searches") as any)
        .insert([newSearch])
        .select()
        .single();

      const { data, error: err } = saveResponse as {
        data: SavedSearch;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (err) throw err;

      savedSearches.value = [data, ...savedSearches.value];
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to save search";
      console.error("Save search error:", err);
      return null;
    }
  };

  // Delete a saved search
  const deleteSavedSearch = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    error.value = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deleteResponse = await (supabase.from("saved_searches") as any)
        .delete()
        .eq("id", id)
        .eq("user_id", userStore.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = deleteResponse as { error: any };

      if (err) throw err;

      savedSearches.value = savedSearches.value.filter((s) => s.id !== id);
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to delete saved search";
      console.error("Delete saved search error:", err);
      return false;
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (id: string): Promise<boolean> => {
    const search = savedSearches.value.find((s) => s.id === id);
    if (!search) return false;

    error.value = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const favResponse = await (supabase.from("saved_searches") as any)
        .update({ is_favorite: !search.is_favorite })
        .eq("id", id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = favResponse as { error: any };

      if (err) throw err;

      search.is_favorite = !search.is_favorite;
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update search";
      console.error("Toggle favorite error:", err);
      return false;
    }
  };

  // Record a search in history
  const recordSearch = async (
    query: string,
    searchType: SearchHistory["searchType"],
    resultsCount: number,
    filtersApplied?: Record<string, unknown>,
  ): Promise<void> => {
    if (!userStore.user) return;

    try {
      const recordResponse =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("search_history") as any).insert([
          {
            user_id: userStore.user.id,
            search_term: query,
            result_count: resultsCount,
            filters: filtersApplied,
            searched_at: new Date().toISOString(),
          },
        ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = recordResponse as { error: any };

      if (err) throw err;

      // Reload history
      await loadSearchHistory();
    } catch (err) {
      console.error("Record search error:", err);
    }
  };

  // Increment use count for saved search
  const incrementUseCount = async (id: string): Promise<void> => {
    const search = savedSearches.value.find((s) => s.id === id);
    if (!search) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countResponse = await (supabase.from("saved_searches") as any)
        .update({ use_count: search.use_count + 1 })
        .eq("id", id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = countResponse as { error: any };

      if (err) throw err;

      search.use_count += 1;
    } catch (err) {
      console.error("Increment use count error:", err);
    }
  };

  // Clear search history
  const clearHistory = async (): Promise<boolean> => {
    if (!userStore.user) return false;

    error.value = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clearResponse = await (supabase.from("search_history") as any)
        .delete()
        .eq("user_id", userStore.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = clearResponse as { error: any };

      if (err) throw err;

      searchHistory.value = [];
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to clear history";
      console.error("Clear history error:", err);
      return false;
    }
  };

  return {
    // State
    savedSearches,
    searchHistory,
    isLoading,
    error,

    // Computed
    favoritedSearches,
    recentSearches,

    // Methods
    loadSavedSearches,
    loadSearchHistory,
    saveSearch,
    deleteSavedSearch,
    toggleFavorite,
    recordSearch,
    incrementUseCount,
    clearHistory,
  };
};
