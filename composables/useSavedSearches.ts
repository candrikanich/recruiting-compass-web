import { ref, computed } from 'vue'
import { useSupabase } from './useSupabase'
import { useUserStore } from '~/stores/user'
import type { SavedSearch, SearchHistory } from '~/types/models'
import type { Database } from '~/types/database'

// Type aliases for Supabase casting
type SavedSearchInsert = Database['public']['Tables']['saved_searches']['Insert']
type SavedSearchUpdate = Database['public']['Tables']['saved_searches']['Update']
type SearchHistoryInsert = Database['public']['Tables']['search_history']['Insert']

/**
 * useSavedSearches composable
 * Manages saved searches and search history for quick access to frequently used searches
 */
export const useSavedSearches = () => {
  const supabase = useSupabase()
  const userStore = useUserStore()

  // State
  const savedSearches = ref<SavedSearch[]>([])
  const searchHistory = ref<SearchHistory[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const favoritedSearches = computed(() => {
    return savedSearches.value.filter(s => s.is_favorite).sort((a, b) => b.use_count - a.use_count)
  })

  const recentSearches = computed(() => {
    return searchHistory.value
      .sort((a, b) => new Date(b.searched_at).getTime() - new Date(a.searched_at).getTime())
      .slice(0, 10)
  })

  // Load saved searches
  const loadSavedSearches = async () => {
    if (!userStore.user) return

    isLoading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', userStore.user.id)
        .order('updated_at', { ascending: false })

      if (err) throw err
      savedSearches.value = data || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load saved searches'
      console.error('Load saved searches error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Load search history
  const loadSearchHistory = async () => {
    if (!userStore.user) return

    isLoading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userStore.user.id)
        .order('searched_at', { ascending: false })
        .limit(50)

      if (err) throw err
      searchHistory.value = data || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load search history'
      console.error('Load search history error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Save a search
  const saveSearch = async (
    name: string,
    query: string,
    searchType: SavedSearch['searchType'],
    filters: SavedSearch['filters'],
    description?: string
  ): Promise<SavedSearch | null> => {
    if (!userStore.user) return null

    error.value = null

    try {
      const newSearch: SavedSearchInsert = {
        user_id: userStore.user.id,
        name,
        filters: {
          ...filters,
          search_term: query
        },
        is_default: false,
      }

      const { data, error: err } = await supabase
        .from('saved_searches')
        .insert([newSearch] as SavedSearchInsert[])
        .select()
        .single()

      if (err) throw err

      savedSearches.value = [data, ...savedSearches.value]
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save search'
      console.error('Save search error:', err)
      return null
    }
  }

  // Delete a saved search
  const deleteSavedSearch = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false

    error.value = null

    try {
      const { error: err } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id)
        .eq('user_id', userStore.user.id)

      if (err) throw err

      savedSearches.value = savedSearches.value.filter(s => s.id !== id)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete saved search'
      console.error('Delete saved search error:', err)
      return false
    }
  }

  // Toggle favorite status
  const toggleFavorite = async (id: string): Promise<boolean> => {
    const search = savedSearches.value.find(s => s.id === id)
    if (!search) return false

    error.value = null

    try {
      const { error: err } = await supabase
        .from('saved_searches')
        .update({ is_favorite: !search.is_favorite } as SavedSearchUpdate)
        .eq('id', id)

      if (err) throw err

      search.is_favorite = !search.is_favorite
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update search'
      console.error('Toggle favorite error:', err)
      return false
    }
  }

  // Record a search in history
  const recordSearch = async (
    query: string,
    searchType: SearchHistory['searchType'],
    resultsCount: number,
    filtersApplied?: Record<string, any>
  ): Promise<void> => {
    if (!userStore.user) return

    try {
      const { error: err } = await supabase
        .from('search_history')
        .insert([
          {
            user_id: userStore.user.id,
            search_term: query,
            result_count: resultsCount,
            filters: filtersApplied,
            searched_at: new Date().toISOString(),
          },
        ] as SearchHistoryInsert[])

      if (err) throw err

      // Reload history
      await loadSearchHistory()
    } catch (err) {
      console.error('Record search error:', err)
    }
  }

  // Increment use count for saved search
  const incrementUseCount = async (id: string): Promise<void> => {
    const search = savedSearches.value.find(s => s.id === id)
    if (!search) return

    try {
      const { error: err } = await supabase
        .from('saved_searches')
        .update({ use_count: search.use_count + 1 } as SavedSearchUpdate)
        .eq('id', id)

      if (err) throw err

      search.use_count += 1
    } catch (err) {
      console.error('Increment use count error:', err)
    }
  }

  // Clear search history
  const clearHistory = async (): Promise<boolean> => {
    if (!userStore.user) return false

    error.value = null

    try {
      const { error: err } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', userStore.user.id)

      if (err) throw err

      searchHistory.value = []
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to clear history'
      console.error('Clear history error:', err)
      return false
    }
  }

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
  }
}
