import { useEntitySearch } from "./useEntitySearch";
import { useSearchFilters } from "./useSearchFilters";

/**
 * Composable for search (backwards-compatible wrapper)
 *
 * ⚠️ DEPRECATED: This composable is deprecated as of Phase 4
 * Use useSearchConsolidated() instead for new code
 *
 * Migration guide: See docs/phase-4/DEPRECATION_AUDIT.md
 * Timeline: Will be removed in Phase 5
 *
 * Combines useEntitySearch and useSearchFilters for unified search interface.
 * For new code, prefer using useSearchConsolidated.
 *
 * @deprecated Use useSearchConsolidated() instead
 *
 * @example
 * // OLD (deprecated)
 * const { performSearch, filters, clearFilters } = useSearch()
 *
 * // NEW (preferred)
 * const { performSearch, filters, clearFilters } = useSearchConsolidated()
 *
 * @returns Combined object with all search operations
 */
export const useSearch = () => {
  const entitySearch = useEntitySearch();
  const filterMgmt = useSearchFilters();

  // Deprecation warning
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[DEPRECATED] useSearch is deprecated as of Phase 4. " +
        "Use useSearchConsolidated() instead.\n" +
        "Migration guide: See DEPRECATION_AUDIT.md",
    );
  }

  /**
   * Override performSearch to integrate filters
   */
  const performSearch = async (searchQuery: string) => {
    await entitySearch.performSearch(searchQuery, filterMgmt.filters);
  };

  /**
   * Override clearFilters to also re-run search if needed
   */
  const clearFilters = async () => {
    filterMgmt.clearFilters();
    if (entitySearch.query.value) {
      await performSearch(entitySearch.query.value);
    }
  };

  /**
   * Override applyFilter to re-run search if needed
   */
  const applyFilter = async (
    category: string,
    filterName: string,
    value: any,
  ) => {
    filterMgmt.applyFilter(category, filterName, value);
    if (entitySearch.query.value) {
      await performSearch(entitySearch.query.value);
    }
  };

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
  };
};
