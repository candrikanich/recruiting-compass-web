import { ref, computed } from "vue";
import Fuse from "fuse.js";
import { querySelect } from "~/utils/supabaseQuery";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useErrorHandler } from "./useErrorHandler";
import type {
  School,
  Coach,
  Interaction,
  PerformanceMetric,
} from "~/types/models";

/**
 * Consolidated composable for comprehensive search functionality
 *
 * Merges functionality from:
 * - useEntitySearch (search schools, coaches, interactions, metrics)
 * - useSearchFilters (filter management)
 * - useCachedSearch (result caching with debouncing)
 *
 * Provides unified interface for global search with:
 * - Multi-entity search (schools, coaches, interactions, metrics)
 * - Advanced filtering by entity type
 * - Fuzzy search powered by Fuse.js
 * - Debounced searching for performance
 * - Result caching to avoid redundant queries
 * - Autocomplete suggestions
 *
 * @example
 * const {
 *   performSearch,
 *   schoolResults,
 *   filters,
 *   applyFilter,
 *   isSearching
 * } = useSearchConsolidated()
 *
 * // Search with filters applied
 * await performSearch('stanford')
 * applyFilter('schools', 'division', 'D1')
 * await performSearch('stanford') // Re-runs with active filters
 *
 * @returns Object with search methods, results, and filter management
 */
export const useSearchConsolidated = () => {
  const _supabase = useSupabase();
  const userStore = useUserStore();
  const { getErrorMessage, logError } = useErrorHandler();

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const query = ref("");
  const searchType = ref<
    "all" | "schools" | "coaches" | "interactions" | "metrics"
  >("all");
  const isSearching = ref(false);
  const searchError = ref<string | null>(null);
  const useFuzzySearch = ref(true);

  // Results
  const schoolResults = ref<School[]>([]);
  const coachResults = ref<Coach[]>([]);
  const interactionResults = ref<Interaction[]>([]);
  const metricsResults = ref<PerformanceMetric[]>([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const filters = ref({
    schools: {
      division: "" as string,
      state: "" as string,
      verified: null as boolean | null,
    },
    coaches: {
      sport: "" as string,
      responseRate: 0 as number,
      verified: null as boolean | null,
    },
    interactions: {
      sentiment: "" as string,
      direction: "" as string,
      dateFrom: "" as string,
      dateTo: "" as string,
    },
    metrics: {
      metricType: "" as string,
      minValue: 0 as number,
      maxValue: 100 as number,
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const searchCache = new Map<
    string,
    {
      results: {
        schools: School[];
        coaches: Coach[];
        interactions: Interaction[];
        metrics: PerformanceMetric[];
      };
      timestamp: number;
    }
  >();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  let searchTimeoutId: ReturnType<typeof setTimeout>;

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED PROPERTIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Total number of results across all types
   */
  const totalResults = computed(() => {
    return (
      schoolResults.value.length +
      coachResults.value.length +
      interactionResults.value.length +
      metricsResults.value.length
    );
  });

  /**
   * Whether any results exist
   */
  const hasResults = computed(() => totalResults.value > 0);

  /**
   * Whether any filters are active
   */
  const isFiltering = computed(() => {
    return Object.values(filters.value).some((filterGroup) =>
      Object.values(filterGroup).some(
        (value) =>
          value !== "" && value !== 0 && value !== false && value !== null,
      ),
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FUZZY SEARCH UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply fuzzy search to result set using Fuse.js
   */
  const applyFuzzySearch = <T>(
    items: T[],
    searchQuery: string,
    keys: string[],
  ): T[] => {
    if (!useFuzzySearch.value || !searchQuery.trim()) return items;

    const fuse = new Fuse(items, {
      keys,
      threshold: 0.4,
      minMatchCharLength: 2,
    });

    return fuse.search(searchQuery).map((result) => result.item);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTITY SEARCH FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Search schools
   */
  const searchSchools = async (searchQuery: string) => {
    if (!userStore.user) return;

    try {
      const filterObj: Record<string, string | number | boolean | null> = {
        user_id: userStore.user.id,
      };

      // Apply active filters
      if (filters.value.schools.division) {
        filterObj.division = filters.value.schools.division;
      }
      if (filters.value.schools.state) {
        filterObj.state = filters.value.schools.state;
      }
      if (filters.value.schools.verified !== null) {
        filterObj.verified = filters.value.schools.verified;
      }

      const { data, error } = await querySelect<School>(
        "schools",
        {
          select: "*",
          filters: filterObj,
          limit: 20,
        },
        { context: "searchSchools" },
      );

      if (error) throw error;

      // Apply fuzzy search to results
      schoolResults.value = applyFuzzySearch(data || [], searchQuery, [
        "name",
        "address",
        "city",
        "state",
      ]);
    } catch (err) {
      logError(err, { context: "searchSchools" });
      schoolResults.value = [];
    }
  };

  /**
   * Search coaches
   */
  const searchCoaches = async (searchQuery: string) => {
    if (!userStore.user) return;

    try {
      const filterObj: Record<string, string | number | boolean | null> = {
        user_id: userStore.user.id,
      };

      // Apply active filters
      if (filters.value.coaches.sport) {
        filterObj.sport = filters.value.coaches.sport;
      }
      if (filters.value.coaches.verified !== null) {
        filterObj.verified = filters.value.coaches.verified;
      }

      const { data, error } = await querySelect<Coach>(
        "coaches",
        {
          select: "*",
          filters: filterObj,
          limit: 20,
        },
        { context: "searchCoaches" },
      );

      if (error) throw error;

      // Filter by response rate if specified
      let results: Coach[] | null = data;
      if (results && filters.value.coaches.responseRate > 0) {
        results = results.filter(
          (c) =>
            ((c as Coach & { response_rate?: number }).response_rate || 0) >=
            filters.value.coaches.responseRate / 100,
        );
      }

      // Apply fuzzy search
      coachResults.value = applyFuzzySearch(results || [], searchQuery, [
        "name",
        "school",
        "email",
        "phone",
      ]);
    } catch (err) {
      logError(err, { context: "searchCoaches" });
      coachResults.value = [];
    }
  };

  /**
   * Search interactions
   */
  const searchInteractions = async (searchQuery: string) => {
    if (!userStore.user) return;

    try {
      const filterObj: Record<string, string | number | boolean | null> = {
        user_id: userStore.user.id,
      };

      // Apply active filters
      if (filters.value.interactions.sentiment) {
        filterObj.sentiment_label = filters.value.interactions.sentiment;
      }
      if (filters.value.interactions.direction) {
        filterObj.direction = filters.value.interactions.direction;
      }

      const { data, error } = await querySelect<Interaction>(
        "interactions",
        {
          select: "*",
          filters: filterObj,
          order: { column: "recorded_date", ascending: false },
          limit: 20,
        },
        { context: "searchInteractions" },
      );

      if (error) throw error;

      // Apply date range filters
      let results: Interaction[] | null = data;
      if (results && filters.value.interactions.dateFrom) {
        results = results.filter(
          (i) =>
            new Date(i.recorded_date || Date.now()).getTime() >=
            new Date(filters.value.interactions.dateFrom).getTime(),
        );
      }
      if (results && filters.value.interactions.dateTo) {
        results = results.filter(
          (i) =>
            new Date(i.recorded_date || Date.now()).getTime() <=
            new Date(filters.value.interactions.dateTo).getTime(),
        );
      }

      // Apply fuzzy search (on subject and notes)
      interactionResults.value = applyFuzzySearch(results || [], searchQuery, [
        "subject",
        "notes",
      ]);
    } catch (err) {
      logError(err, { context: "searchInteractions" });
      interactionResults.value = [];
    }
  };

  /**
   * Search metrics
   */
  const searchMetrics = async (searchQuery: string) => {
    if (!userStore.user) return;

    try {
      const filterObj: Record<string, string | number | boolean | null> = {
        user_id: userStore.user.id,
      };

      // Apply active filters
      if (filters.value.metrics.metricType) {
        filterObj.metric_type = filters.value.metrics.metricType;
      }

      const { data, error } = await querySelect<PerformanceMetric>(
        "performance_metrics",
        {
          select: "*",
          filters: filterObj,
          order: { column: "recorded_date", ascending: false },
          limit: 20,
        },
        { context: "searchMetrics" },
      );

      if (error) throw error;

      // Apply value range filters
      let results: PerformanceMetric[] | null = data;
      if (results && filters.value.metrics.minValue > 0) {
        results = results.filter(
          (m) => (m.value || 0) >= filters.value.metrics.minValue,
        );
      }
      if (results && filters.value.metrics.maxValue < 100) {
        results = results.filter(
          (m) => (m.value || 0) <= filters.value.metrics.maxValue,
        );
      }

      // Filter by search query in notes
      if (results && searchQuery.trim()) {
        results = results.filter(
          (m) =>
            !m.notes ||
            m.notes.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      }

      metricsResults.value = results || [];
    } catch (err) {
      logError(err, { context: "searchMetrics" });
      metricsResults.value = [];
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate cache key from query and filters
   */
  const getCacheKey = (): string => {
    const filterStr = JSON.stringify(filters.value);
    return `${query.value}|${searchType.value}|${filterStr}`;
  };

  /**
   * Check if cached results are valid (within TTL)
   */
  const isCacheValid = (
    cacheEntry: { timestamp: number } | null | undefined,
  ): boolean => {
    if (!cacheEntry) return false;
    return Date.now() - cacheEntry.timestamp < CACHE_TTL;
  };

  /**
   * Clear cache
   */
  const clearCache = () => {
    searchCache.clear();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SEARCH FUNCTION (DEBOUNCED)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Perform search with debouncing and caching
   *
   * Debounces search requests (300ms) to avoid excessive queries.
   * Caches results for 5 minutes to avoid redundant API calls.
   * Integrates filter state automatically.
   */
  const performSearch = async (searchQuery: string) => {
    // Clear any pending searches
    clearTimeout(searchTimeoutId);

    if (!searchQuery.trim()) {
      clearResults();
      return;
    }

    query.value = searchQuery;

    // Check cache first
    const cacheKey = getCacheKey();
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult && isCacheValid(cachedResult)) {
      schoolResults.value = cachedResult?.results.schools || [];
      coachResults.value = cachedResult?.results.coaches || [];
      interactionResults.value = cachedResult?.results.interactions || [];
      metricsResults.value = cachedResult?.results.metrics || [];
      return;
    }

    // Debounce actual search execution
    clearTimeout(searchTimeoutId);
    searchTimeoutId = setTimeout(async () => {
      isSearching.value = true;
      searchError.value = null;

      try {
        // Execute searches in parallel based on search type
        const searches = [];

        if (searchType.value === "all" || searchType.value === "schools") {
          searches.push(searchSchools(searchQuery));
        }
        if (searchType.value === "all" || searchType.value === "coaches") {
          searches.push(searchCoaches(searchQuery));
        }
        if (searchType.value === "all" || searchType.value === "interactions") {
          searches.push(searchInteractions(searchQuery));
        }
        if (searchType.value === "all" || searchType.value === "metrics") {
          searches.push(searchMetrics(searchQuery));
        }

        await Promise.all(searches);

        // Cache results
        searchCache.set(cacheKey, {
          results: {
            schools: schoolResults.value,
            coaches: coachResults.value,
            interactions: interactionResults.value,
            metrics: metricsResults.value,
          },
          timestamp: Date.now(),
        });
      } catch (err) {
        searchError.value = getErrorMessage(err, { context: "performSearch" });
        logError(err, { context: "performSearch" });
      } finally {
        isSearching.value = false;
      }
    }, 300);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clear all search results
   */
  const clearResults = () => {
    schoolResults.value = [];
    coachResults.value = [];
    interactionResults.value = [];
    metricsResults.value = [];
    query.value = "";
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply a single filter and re-run search if active
   */
  const applyFilter = async (
    category: "schools" | "coaches" | "interactions" | "metrics",
    filterName: string,
    value: unknown,
  ) => {
    const categoryFilter = filters.value[category];
    if (categoryFilter) {
      (categoryFilter as Record<string, unknown>)[filterName] = value;
    }

    // Re-run search if query is active
    if (query.value.trim()) {
      clearCache(); // Invalidate cache when filters change
      await performSearch(query.value);
    }
  };

  /**
   * Clear all filters and optionally re-run search
   */
  const clearFilters = async () => {
    filters.value.schools = { division: "", state: "", verified: null };
    filters.value.coaches = { sport: "", responseRate: 0, verified: null };
    filters.value.interactions = {
      sentiment: "",
      direction: "",
      dateFrom: "",
      dateTo: "",
    };
    filters.value.metrics = { metricType: "", minValue: 0, maxValue: 100 };

    clearCache();

    if (query.value.trim()) {
      await performSearch(query.value);
    }
  };

  /**
   * Get specific filter value
   */
  const getFilterValue = (
    category: "schools" | "coaches" | "interactions" | "metrics",
    filterName: string,
  ): unknown => {
    return (
      (filters.value[category] as Record<string, unknown>)?.[filterName] || null
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SUGGESTIONS (AUTOCOMPLETE)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get school name suggestions for autocomplete
   */
  const getSchoolSuggestions = async (prefix: string): Promise<string[]> => {
    if (!userStore.user || prefix.length < 2) return [];

    try {
      const { data, error } = await querySelect<{ name: string }>(
        "schools",
        {
          select: "name",
          filters: { user_id: userStore.user.id },
          limit: 10,
        },
        { context: "getSchoolSuggestions", silent: true },
      );

      if (error) return [];

      return (data || [])
        .filter((s) => s.name.toLowerCase().startsWith(prefix.toLowerCase()))
        .map((s) => s.name);
    } catch {
      return [];
    }
  };

  /**
   * Get coach name suggestions for autocomplete
   */
  const getCoachSuggestions = async (prefix: string): Promise<string[]> => {
    if (!userStore.user || prefix.length < 2) return [];

    try {
      const { data, error } = await querySelect<{ name: string }>(
        "coaches",
        {
          select: "name",
          filters: { user_id: userStore.user.id },
          limit: 10,
        },
        { context: "getCoachSuggestions", silent: true },
      );

      if (error) return [];

      return (data || [])
        .filter((c) => c.name.toLowerCase().startsWith(prefix.toLowerCase()))
        .map((c) => c.name);
    } catch {
      return [];
    }
  };

  /**
   * Get college name suggestions from College Scorecard API
   * Merged from useCollegeAutocomplete for unified search interface
   * Requires minimum 3 characters to avoid excessive API calls
   */
  const getCollegeSuggestions = async (
    query: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      location: string;
    }>
  > => {
    // Clear on short queries
    if (query.length < 3) return [];

    try {
      const params = new URLSearchParams({
        q: query,
        fields:
          "id,school.name,school.city,school.state,location.lat,location.lon",
        per_page: "10",
      });

      const url = `/api/colleges/search?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as {
        results?: Array<{
          id: number;
          "school.name": string;
          "school.city": string;
          "school.state": string;
        }>;
      };

      if (!data.results || data.results.length === 0) {
        return [];
      }

      // Deduplicate and transform results
      const uniqueSchools = new Map<
        string,
        {
          id: string;
          name: string;
          location: string;
        }
      >();

      for (const school of data.results) {
        const id = String(school.id);
        if (!uniqueSchools.has(id)) {
          const city = school["school.city"] || "";
          const state = school["school.state"] || "";
          const location = [city, state].filter(Boolean).join(", ");

          uniqueSchools.set(id, {
            id,
            name: school["school.name"],
            location,
          });
        }
      }

      return Array.from(uniqueSchools.values());
    } catch {
      return [];
    }
  };

  return {
    // Search state
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

    // Filter state
    filters,
    isFiltering,

    // Search methods
    performSearch,
    clearResults,

    // Filter methods
    applyFilter,
    clearFilters,
    getFilterValue,

    // Cache methods
    clearCache,

    // Suggestions (including college autocomplete inlined from useCollegeAutocomplete)
    getSchoolSuggestions,
    getCoachSuggestions,
    getCollegeSuggestions,
  };
};
