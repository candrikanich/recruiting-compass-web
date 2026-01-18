import { useEntitySearch } from './useEntitySearch'
import { useSearchFilters } from './useSearchFilters'

/**
 * Composable for search (backwards-compatible wrapper)
 *
 * Combines useEntitySearch and useSearchFilters for unified search interface.
 * For new code, prefer using useEntitySearch and useSearchFilters directly.
 *
 * @deprecated Prefer using useEntitySearch and useSearchFilters directly
 *
 * @example
 * const { performSearch, filters, clearFilters } = useSearch()
 *
 * @returns Combined object with all search operations
 */
export const useSearch = () => {
  const entitySearch = useEntitySearch()
  const filterMgmt = useSearchFilters()

  /**
   * Override performSearch to integrate filters
   */
  const performSearch = async (searchQuery: string) => {
    await entitySearch.performSearch(searchQuery, filterMgmt.filters)
  }

  /**
   * Override clearFilters to also re-run search if needed
   */
  const clearFilters = async () => {
    filterMgmt.clearFilters()
    if (entitySearch.query.value) {
      await performSearch(entitySearch.query.value)
    }
  }

  /**
   * Override applyFilter to re-run search if needed
   */
  const applyFilter = async (category: string, filterName: string, value: any) => {
    filterMgmt.applyFilter(category, filterName, value)
    if (entitySearch.query.value) {
      await performSearch(entitySearch.query.value)
    }
  }

  return {
    // From entitySearch
    query: entitySearch.query,
    searchType: entitySearch.searchType,
    isSearching: entitySearch.isSearching,
    searchError: entitySearch.searchError,
    useFuzzySearch: entitySearch.useFuzzySearch,

    // Results
    schoolResults: entitySearch.schoolResults,
    coachResults: entitySearch.coachResults,
    interactionResults: entitySearch.interactionResults,
    metricsResults: entitySearch.metricsResults,
    totalResults: entitySearch.totalResults,
    hasResults: entitySearch.hasResults,

    // From filterMgmt
    filters: filterMgmt.filters,
    isFiltering: filterMgmt.isFiltering,

    // Methods
    performSearch,
    clearResults: entitySearch.clearResults,
    clearFilters,
    applyFilter,
    getSchoolSuggestions: entitySearch.getSchoolSuggestions,
    getCoachSuggestions: entitySearch.getCoachSuggestions,
  }
}
