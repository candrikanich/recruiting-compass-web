/**
 * Stateful composable for coach page filtering and sorting
 */

import { ref, computed } from "vue";
import type { Ref, ComputedRef } from "vue";
import type { Coach, School } from "~/types/models";
import { getSchoolName } from "~/utils/coachHelpers";

export type FilterField = "search" | "role" | "lastContact" | "responsiveness";

export const useCoachPageFilters = (
  allCoaches: Ref<Coach[]>,
  schools: Ref<School[]>,
  sortBy: Ref<string>,
) => {
  const filterValues = ref(new Map<string, string | null>());

  /**
   * Apply all active filters and sorting to coaches array
   */
  const filteredCoaches: ComputedRef<Coach[]> = computed(() => {
    const result = allCoaches.value.filter((coach) => {
      // Search filter - searches across multiple fields
      const searchTerm = filterValues.value.get("search");
      const searchLower = String(searchTerm || "").toLowerCase();
      const matchesSearch =
        !searchTerm ||
        coach.first_name.toLowerCase().includes(searchLower) ||
        coach.last_name.toLowerCase().includes(searchLower) ||
        coach.email?.toLowerCase().includes(searchLower) ||
        coach.phone?.includes(String(searchTerm)) ||
        coach.notes?.toLowerCase().includes(searchLower) ||
        coach.twitter_handle?.toLowerCase().includes(searchLower) ||
        coach.instagram_handle?.toLowerCase().includes(searchLower);

      // Role filter - exact match
      const roleFilter = filterValues.value.get("role");
      const matchesRole = !roleFilter || coach.role === roleFilter;

      // Last contact filter - date range calculation
      let matchesLastContact = true;
      const lastContactFilter = filterValues.value.get("lastContact");
      if (lastContactFilter) {
        const days = parseInt(String(lastContactFilter), 10);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        if (coach.last_contact_date) {
          matchesLastContact = new Date(coach.last_contact_date) >= cutoffDate;
        }
      }

      // Responsiveness filter - score range calculation
      let matchesResponsiveness = true;
      const responsivenessFilter = filterValues.value.get("responsiveness");
      if (responsivenessFilter) {
        const score = coach.responsiveness_score || 0;
        switch (responsivenessFilter) {
          case "high":
            matchesResponsiveness = score >= 75;
            break;
          case "medium":
            matchesResponsiveness = score >= 50 && score < 75;
            break;
          case "low":
            matchesResponsiveness = score < 50;
            break;
        }
      }

      return (
        matchesSearch &&
        matchesRole &&
        matchesLastContact &&
        matchesResponsiveness
      );
    });

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy.value) {
        case "name":
          return (
            a.last_name.localeCompare(b.last_name) ||
            a.first_name.localeCompare(b.first_name)
          );
        case "school": {
          const schoolA = getSchoolName(a.school_id, schools.value) || "";
          const schoolB = getSchoolName(b.school_id, schools.value) || "";
          return schoolA.localeCompare(schoolB);
        }
        case "last-contacted": {
          const dateA = a.last_contact_date
            ? new Date(a.last_contact_date).getTime()
            : 0;
          const dateB = b.last_contact_date
            ? new Date(b.last_contact_date).getTime()
            : 0;
          return dateB - dateA; // Most recent first
        }
        case "responsiveness":
          return (b.responsiveness_score || 0) - (a.responsiveness_score || 0); // Highest first
        case "role": {
          const roleOrder = { head: 0, assistant: 1, recruiting: 2 };
          return (
            (roleOrder[a.role as keyof typeof roleOrder] || 3) -
            (roleOrder[b.role as keyof typeof roleOrder] || 3)
          );
        }
        default:
          return 0;
      }
    });

    return result;
  });

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
   * Count number of active filters
   */
  const activeFilterCount = computed(() => {
    let count = 0;
    for (const [, value] of filterValues.value) {
      if (value) count++;
    }
    return count;
  });

  /**
   * Update a specific filter value
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

  return {
    filterValues,
    filteredCoaches,
    hasActiveFilters,
    activeFilterCount,
    handleFilterUpdate,
    clearFilters,
  };
};
