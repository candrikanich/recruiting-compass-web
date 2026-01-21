import { ref, computed } from 'vue'
import Fuse from 'fuse.js'
import { useSupabase } from './useSupabase'
import { useUserStore } from '~/stores/user'
import type { School, Coach, Interaction, PerformanceMetric } from '~/types/models'

/**
 * Composable for entity search operations
 *
 * ⚠️ DEPRECATED: This composable is deprecated as of Phase 4
 * Use useSearchConsolidated() instead for new code
 *
 * Migration guide: See docs/phase-4/DEPRECATION_AUDIT.md
 * Timeline: Will be removed in Phase 5
 *
 * Handles searching schools, coaches, interactions, and metrics.
 * Supports fuzzy search with Fuse.js and database filtering.
 * For new code, use useSearchConsolidated instead.
 *
 * @deprecated Use useSearchConsolidated() instead
 *
 * @example
 * // OLD (deprecated)
 * const { performSearch, schoolResults, isSearching } = useEntitySearch()
 *
 * // NEW (preferred)
 * const { performSearch, schoolResults, isSearching } = useSearchConsolidated()
 *
 * @returns Object with search methods and results
 */
export const useEntitySearch = () => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] useEntitySearch is deprecated as of Phase 4. ' +
      'Use useSearchConsolidated() instead.\n' +
      'Migration guide: See DEPRECATION_AUDIT.md'
    )
  }

  const supabase = useSupabase()
  const userStore = useUserStore()

  // Search state
  const query = ref('')
  const searchType = ref<'all' | 'schools' | 'coaches' | 'interactions' | 'metrics'>('all')
  const isSearching = ref(false)
  const searchError = ref<string | null>(null)
  const useFuzzySearch = ref(true)

  // Results
  const schoolResults = ref<School[]>([])
  const coachResults = ref<Coach[]>([])
  const interactionResults = ref<Interaction[]>([])
  const metricsResults = ref<PerformanceMetric[]>([])

  // Computed properties
  const totalResults = computed(() => {
    return schoolResults.value.length + coachResults.value.length + interactionResults.value.length + metricsResults.value.length
  })

  const hasResults = computed(() => totalResults.value > 0)

  /**
   * Apply fuzzy search to result set
   */
  const applyFuzzySearch = <T extends any>(items: T[], searchQuery: string, keys: string[]): T[] => {
    if (!useFuzzySearch.value) return items

    const fuse = new Fuse(items, {
      keys,
      threshold: 0.4,
      minMatchCharLength: 2,
    })

    return fuse.search(searchQuery).map(result => result.item)
  }

  /**
   * Search schools by name
   */
  const searchSchools = async (searchQuery: string, filters: any) => {
    if (!userStore.user) return

    try {
      let queryBuilder = supabase
        .from('schools')
        .select('*')
        .eq('user_id', userStore.user.id)
        .ilike('name', `%${searchQuery}%`)
        .limit(20)

      if (filters.schools?.division) {
        queryBuilder = queryBuilder.eq('division', filters.schools.division)
      }
      if (filters.schools?.state) {
        queryBuilder = queryBuilder.eq('state', filters.schools.state)
      }
      if (filters.schools?.verified !== null) {
        queryBuilder = queryBuilder.eq('verified', filters.schools.verified)
      }

      const { data, error } = await queryBuilder

      if (error) throw error
      schoolResults.value = applyFuzzySearch(data || [], searchQuery, ['name', 'address', 'city', 'state'])
    } catch (error) {
      console.error('School search error:', error)
      schoolResults.value = []
    }
  }

  /**
   * Search coaches
   */
  const searchCoaches = async (searchQuery: string, filters: any) => {
    if (!userStore.user) return

    try {
      let queryBuilder = supabase
        .from('coaches')
        .select('*')
        .eq('user_id', userStore.user.id)
        .or(`name.ilike.%${searchQuery}%,school.ilike.%${searchQuery}%`)
        .limit(20)

      if (filters.coaches?.sport) {
        queryBuilder = queryBuilder.eq('sport', filters.coaches.sport)
      }
      if (filters.coaches?.responseRate > 0) {
        queryBuilder = queryBuilder.gte('response_rate', filters.coaches.responseRate / 100)
      }
      if (filters.coaches?.verified !== null) {
        queryBuilder = queryBuilder.eq('verified', filters.coaches.verified)
      }

      const { data, error } = await queryBuilder

      if (error) throw error
      coachResults.value = applyFuzzySearch(data || [], searchQuery, ['name', 'school', 'email', 'phone'])
    } catch (error) {
      console.error('Coach search error:', error)
      coachResults.value = []
    }
  }

  /**
   * Search interactions
   */
  const searchInteractions = async (searchQuery: string, filters: any) => {
    if (!userStore.user) return

    try {
      let queryBuilder = supabase
        .from('interactions')
        .select('*')
        .eq('user_id', userStore.user.id)
        .or(`subject.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`)
        .order('recorded_date', { ascending: false })
        .limit(20)

      if (filters.interactions?.sentiment) {
        queryBuilder = queryBuilder.eq('sentiment_label', filters.interactions.sentiment)
      }
      if (filters.interactions?.direction) {
        queryBuilder = queryBuilder.eq('direction', filters.interactions.direction)
      }
      if (filters.interactions?.dateFrom) {
        queryBuilder = queryBuilder.gte('recorded_date', filters.interactions.dateFrom)
      }
      if (filters.interactions?.dateTo) {
        queryBuilder = queryBuilder.lte('recorded_date', filters.interactions.dateTo)
      }

      const { data, error } = await queryBuilder

      if (error) throw error
      interactionResults.value = data || []
    } catch (error) {
      console.error('Interaction search error:', error)
      interactionResults.value = []
    }
  }

  /**
   * Search metrics
   */
  const searchMetrics = async (searchQuery: string, filters: any) => {
    if (!userStore.user) return

    try {
      let queryBuilder = supabase
        .from('performance_metrics')
        .select('*')
        .eq('user_id', userStore.user.id)
        .order('recorded_date', { ascending: false })
        .limit(20)

      if (filters.metrics?.metricType) {
        queryBuilder = queryBuilder.eq('metric_type', filters.metrics.metricType)
      }
      if (filters.metrics?.minValue > 0) {
        queryBuilder = queryBuilder.gte('value', filters.metrics.minValue)
      }
      if (filters.metrics?.maxValue < 100) {
        queryBuilder = queryBuilder.lte('value', filters.metrics.maxValue)
      }

      const { data, error } = await queryBuilder

      if (error) throw error
      metricsResults.value = (data || []).filter(
        (m: PerformanceMetric) => !searchQuery || !m.notes || m.notes.toLowerCase().includes(searchQuery.toLowerCase())
      )
    } catch (error) {
      console.error('Metrics search error:', error)
      metricsResults.value = []
    }
  }

  /**
   * Perform main search across configured entity types
   */
  const performSearch = async (searchQuery: string, filters: any) => {
    if (!searchQuery.trim()) {
      clearResults()
      return
    }

    query.value = searchQuery
    isSearching.value = true
    searchError.value = null

    try {
      if (searchType.value === 'all' || searchType.value === 'schools') {
        await searchSchools(searchQuery, filters)
      }

      if (searchType.value === 'all' || searchType.value === 'coaches') {
        await searchCoaches(searchQuery, filters)
      }

      if (searchType.value === 'all' || searchType.value === 'interactions') {
        await searchInteractions(searchQuery, filters)
      }

      if (searchType.value === 'all' || searchType.value === 'metrics') {
        await searchMetrics(searchQuery, filters)
      }
    } catch (error) {
      searchError.value = error instanceof Error ? error.message : 'Search failed'
      console.error('Search error:', error)
    } finally {
      isSearching.value = false
    }
  }

  /**
   * Clear all search results
   */
  const clearResults = () => {
    schoolResults.value = []
    coachResults.value = []
    interactionResults.value = []
    metricsResults.value = []
    query.value = ''
  }

  /**
   * Get school name suggestions for autocomplete
   */
  const getSchoolSuggestions = async (prefix: string): Promise<string[]> => {
    if (!userStore.user || prefix.length < 2) return []

    try {
      const { data } = await supabase
        .from('schools')
        .select('name')
        .eq('user_id', userStore.user.id)
        .ilike('name', `${prefix}%`)
        .limit(10)

      return data?.map((s: { name: string }) => s.name) || []
    } catch {
      return []
    }
  }

  /**
   * Get coach name suggestions for autocomplete
   */
  const getCoachSuggestions = async (prefix: string): Promise<string[]> => {
    if (!userStore.user || prefix.length < 2) return []

    try {
      const { data } = await supabase
        .from('coaches')
        .select('name')
        .eq('user_id', userStore.user.id)
        .ilike('name', `${prefix}%`)
        .limit(10)

      return data?.map((c: { name: string }) => c.name) || []
    } catch {
      return []
    }
  }

  return {
    // State
    query,
    searchType,
    isSearching,
    searchError,
    useFuzzySearch,

    // Results
    schoolResults,
    coachResults,
    interactionResults,
    metricsResults,
    totalResults,
    hasResults,

    // Methods
    performSearch,
    clearResults,
    getSchoolSuggestions,
    getCoachSuggestions,
  }
}
