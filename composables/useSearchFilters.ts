import { ref, computed } from 'vue'

/**
 * Composable for search filter management
 *
 * ⚠️ DEPRECATED: This composable is deprecated as of Phase 4
 * Use useSearchConsolidated() instead for new code
 *
 * Migration guide: See docs/phase-4/DEPRECATION_AUDIT.md
 * Timeline: Will be removed in Phase 5
 *
 * Manages filter state across schools, coaches, interactions, and metrics.
 * Provides methods to apply, reset, and query filter status.
 * For new code, use useSearchConsolidated instead.
 *
 * @deprecated Use useSearchConsolidated() instead
 *
 * @example
 * // OLD (deprecated)
 * const { filters, applyFilter, clearFilters, isFiltering } = useSearchFilters()
 *
 * // NEW (preferred)
 * const { filters, applyFilter, clearFilters, isFiltering } = useSearchConsolidated()
 *
 * @returns Object with filter state and management methods
 */
export const useSearchFilters = () => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] useSearchFilters is deprecated as of Phase 4. ' +
      'Use useSearchConsolidated() instead.\n' +
      'Migration guide: See DEPRECATION_AUDIT.md'
    )
  }

  // Filter state
  const filters = ref({
    schools: {
      division: '' as string,
      state: '' as string,
      verified: false as boolean | null,
    },
    coaches: {
      sport: '' as string,
      responseRate: 0 as number,
      verified: false as boolean | null,
    },
    interactions: {
      sentiment: '' as string,
      direction: '' as string,
      dateFrom: '' as string,
      dateTo: '' as string,
    },
    metrics: {
      metricType: '' as string,
      minValue: 0 as number,
      maxValue: 100 as number,
    },
  })

  /**
   * Computed: whether any filters are active
   */
  const isFiltering = computed(() => {
    return Object.values(filters.value).some(filterGroup =>
      Object.values(filterGroup).some(value => value !== '' && value !== 0 && value !== false && value !== null)
    )
  })

  /**
   * Apply a single filter
   */
  const applyFilter = (category: string, filterName: string, value: any) => {
    const categoryKey = category as keyof typeof filters.value
    const filterGroup = filters.value[categoryKey]
    if (filterGroup) {
      (filterGroup as Record<string, any>)[filterName] = value
    }
  }

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    filters.value.schools = { division: '', state: '', verified: null }
    filters.value.coaches = { sport: '', responseRate: 0, verified: null }
    filters.value.interactions = { sentiment: '', direction: '', dateFrom: '', dateTo: '' }
    filters.value.metrics = { metricType: '', minValue: 0, maxValue: 100 }
  }

  /**
   * Get filter value for a specific category and name
   */
  const getFilterValue = (category: string, filterName: string): any => {
    const categoryKey = category as keyof typeof filters.value
    const filterGroup = filters.value[categoryKey]
    if (filterGroup) {
      return (filterGroup as Record<string, any>)[filterName]
    }
    return null
  }

  /**
   * Check if a specific filter is active
   */
  const isFilterActive = (category: string, filterName: string): boolean => {
    const value = getFilterValue(category, filterName)
    return value !== '' && value !== 0 && value !== false && value !== null
  }

  return {
    filters,
    isFiltering,
    applyFilter,
    clearFilters,
    getFilterValue,
    isFilterActive,
  }
}
