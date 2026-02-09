import type { Ref } from "vue";
import { ref, computed } from "vue";
import type { Interaction } from "~/types/models";

/**
 * Composable for filtering interactions with multi-criteria support
 *
 * @param interactions - Source interactions array to filter
 * @returns Filter state and computed filtered results
 */
export const useInteractionFilters = (interactions: Ref<Interaction[]>) => {
  const filterValues = ref(new Map<string, string | null>());

  /**
   * Check if any filters are currently active
   */
  const hasActiveFilters = computed(() => {
    for (const [, value] of filterValues.value) {
      if (value) return true;
    }
    return false;
  });

  /**
   * Update a specific filter field
   *
   * @param field - Filter field name (search, type, loggedBy, direction, sentiment, timePeriod)
   * @param value - Filter value or null to remove filter
   */
  const handleFilterUpdate = (field: string, value: string | null) => {
    const newMap = new Map(filterValues.value);
    if (value) {
      newMap.set(field, value);
    } else {
      newMap.delete(field);
    }
    filterValues.value = newMap;
  };

  /**
   * Clear all active filters
   */
  const clearFilters = () => {
    filterValues.value = new Map();
  };

  /**
   * Computed filtered interactions based on active filter criteria
   * Filters by: search, type, loggedBy, direction, sentiment, timePeriod
   * Sorts by date (newest first)
   */
  const filteredInteractions = computed(() => {
    return interactions.value
      .filter((interaction) => {
        // Search filter (subject/content)
        const searchTerm = filterValues.value.get("search");
        if (searchTerm) {
          const searchLower = String(searchTerm).toLowerCase();
          const matchesSearch =
            interaction.subject?.toLowerCase().includes(searchLower) ||
            false ||
            interaction.content?.toLowerCase().includes(searchLower) ||
            false;
          if (!matchesSearch) return false;
        }

        // Type filter
        const typeFilter = filterValues.value.get("type");
        if (typeFilter && interaction.type !== typeFilter) {
          return false;
        }

        // Logged By filter
        const loggedByFilter = filterValues.value.get("loggedBy");
        if (loggedByFilter && interaction.logged_by !== loggedByFilter) {
          return false;
        }

        // Direction filter
        const directionFilter = filterValues.value.get("direction");
        if (directionFilter && interaction.direction !== directionFilter) {
          return false;
        }

        // Sentiment filter
        const sentimentFilter = filterValues.value.get("sentiment");
        if (sentimentFilter && interaction.sentiment !== sentimentFilter) {
          return false;
        }

        // Time period filter (days)
        const timePeriodFilter = filterValues.value.get("timePeriod");
        if (timePeriodFilter) {
          const days = parseInt(timePeriodFilter, 10);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          const dateValue = interaction.occurred_at || interaction.created_at;
          if (!dateValue) return false;
          const interactionDate = new Date(dateValue);
          if (interactionDate < cutoffDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.occurred_at || a.created_at || "").getTime();
        const dateB = new Date(b.occurred_at || b.created_at || "").getTime();
        return dateB - dateA; // Newest first
      });
  });

  return {
    filterValues,
    hasActiveFilters,
    handleFilterUpdate,
    clearFilters,
    filteredInteractions,
  };
};
