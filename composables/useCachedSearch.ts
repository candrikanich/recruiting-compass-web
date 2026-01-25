import { computed } from "vue";
import { useSearch } from "./useSearch";
import { globalCache, cacheKey, CACHE_DURATION } from "~/utils/cache";
import { useUserStore } from "~/stores/user";
import type {
  School,
  Coach,
  Interaction,
  PerformanceMetric,
} from "~/types/models";

export const useCachedSearch = () => {
  const userStore = useUserStore();
  const searchComposable = useSearch();

  // Helper to safely extract ref value
  const getRefValue = <T>(
    ref: { value: T[] | null | undefined } | null | undefined,
  ): T[] => {
    return ref &&
      typeof ref === "object" &&
      "value" in ref &&
      Array.isArray(ref.value)
      ? ref.value
      : [];
  };

  // Original performSearch with caching
  const performCachedSearch = async (searchQuery: string) => {
    if (!userStore.user) return;

    const searchType =
      getRefValue<string>(searchComposable.searchType)[0] || "all";
    const cacheId = cacheKey.search(userStore.user.id, searchQuery, searchType);

    // Check cache first
    const cached = globalCache.get(cacheId);
    if (cached) {
      // Simply perform the search - it will populate the composable results
      await searchComposable.performSearch(searchQuery);
      return;
    }

    // Perform fresh search
    await searchComposable.performSearch(searchQuery);

    // Cache results from the search composable
    const schoolRes = getRefValue<School>(searchComposable.schoolResults);
    const coachRes = getRefValue<Coach>(searchComposable.coachResults);
    const intRes = getRefValue<Interaction>(
      searchComposable.interactionResults,
    );
    const metRes = getRefValue<PerformanceMetric>(
      searchComposable.metricsResults,
    );

    globalCache.set(
      cacheId,
      {
        schoolResults: schoolRes,
        coachResults: coachRes,
        interactionResults: intRes,
        metricsResults: metRes,
      },
      CACHE_DURATION.MEDIUM,
    );
  };

  // Type guard to ensure search results are properly typed
  const schoolResults = computed(() =>
    getRefValue<School>(searchComposable.schoolResults),
  );
  const coachResults = computed(() =>
    getRefValue<Coach>(searchComposable.coachResults),
  );
  const interactionResults = computed(() =>
    getRefValue<Interaction>(searchComposable.interactionResults),
  );
  const metricsResults = computed(() =>
    getRefValue<PerformanceMetric>(searchComposable.metricsResults),
  );

  const clearSearchCache = () => {
    if (userStore.user) {
      globalCache.clearPattern(new RegExp("^search:" + userStore.user.id));
    }
  };

  const cacheStats = computed(() => {
    return globalCache.getStats();
  });

  return {
    // Re-export search composable properties
    query: searchComposable.query,
    searchType: searchComposable.searchType,
    isSearching: searchComposable.isSearching,
    searchError: searchComposable.searchError,
    filters: searchComposable.filters,
    totalResults: searchComposable.totalResults,
    hasResults: searchComposable.hasResults,
    isFiltering: searchComposable.isFiltering,
    performSearch: performCachedSearch,
    clearResults: searchComposable.clearResults,
    clearFilters: searchComposable.clearFilters,
    applyFilter: searchComposable.applyFilter,
    getSchoolSuggestions: searchComposable.getSchoolSuggestions,
    getCoachSuggestions: searchComposable.getCoachSuggestions,
    // Cached results
    schoolResults,
    coachResults,
    interactionResults,
    metricsResults,
    clearSearchCache,
    cacheStats,
  };
};
