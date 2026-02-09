import { ref, watch } from "vue";
import type { Ref } from "vue";

/**
 * usePageFilters composable
 *
 * Generic composable for managing page filter state including search, filters, and sorting.
 * Supports optional localStorage persistence for maintaining user preferences.
 *
 * Type Parameters:
 * - T: Union type of available sort options (e.g., "name" | "date" | "status")
 *
 * Example:
 * ```typescript
 * type SchoolSortOption = "name" | "status" | "rankingScore";
 *
 * const { searchQuery, filters, sortBy, clearFilters } = usePageFilters<SchoolSortOption>({
 *   defaultSort: "name",
 *   storageKey: "schools-filters"
 * });
 * ```
 */
export const usePageFilters = <T extends string = string>(options?: {
  defaultSort?: T;
  storageKey?: string;
}): {
  searchQuery: Ref<string>;
  filters: Ref<Record<string, unknown>>;
  sortBy: Ref<string>;
  clearFilters: () => void;
} => {
  const searchQuery = ref<string>("");
  const filters = ref<Record<string, unknown>>({});
  const sortBy = ref<string>(options?.defaultSort || "");

  // Load from localStorage on init if key provided
  if (options?.storageKey) {
    const stored = localStorage.getItem(options.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.searchQuery) searchQuery.value = parsed.searchQuery;
        if (parsed.filters) filters.value = parsed.filters;
        if (parsed.sortBy) sortBy.value = parsed.sortBy;
      } catch {
        // Silently ignore parse errors
      }
    }
  }

  // Watch for changes and persist to localStorage if key provided
  if (options?.storageKey) {
    watch(
      [searchQuery, filters, sortBy],
      () => {
        localStorage.setItem(
          options.storageKey!,
          JSON.stringify({
            searchQuery: searchQuery.value,
            filters: filters.value,
            sortBy: sortBy.value,
          }),
        );
      },
      { deep: true },
    );
  }

  /**
   * Clear all filters and reset to defaults
   */
  const clearFilters = () => {
    searchQuery.value = "";
    filters.value = {};
    sortBy.value = options?.defaultSort || "";
  };

  return {
    searchQuery,
    filters,
    sortBy,
    clearFilters,
  };
};
