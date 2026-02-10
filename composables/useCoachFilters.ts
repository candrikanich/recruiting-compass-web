/**
 * Coach Filtering and Sorting Composable
 *
 * Provides pure functions for filtering and sorting coach lists.
 * Used for consistent filtering/sorting across coach list pages.
 */

import type { Coach } from "~/types/models";

export type CoachSortOption = "name" | "lastContact" | "responsiveness";

export const useCoachFilters = () => {
  /**
   * Filters coaches by search query (name, email, phone)
   */
  const filterBySearch = (coaches: Coach[], query: string): Coach[] => {
    if (!query) return coaches;

    const searchLower = query.toLowerCase();
    return coaches.filter(
      (coach) =>
        coach.first_name.toLowerCase().includes(searchLower) ||
        coach.last_name.toLowerCase().includes(searchLower) ||
        coach.email?.toLowerCase().includes(searchLower) ||
        coach.phone?.includes(query),
    );
  };

  /**
   * Filters coaches by role
   */
  const filterByRole = (coaches: Coach[], role: string): Coach[] => {
    if (!role) return coaches;
    return coaches.filter((coach) => coach.role === role);
  };

  /**
   * Sorts coaches by specified criteria (immutable)
   */
  const sortCoaches = (coaches: Coach[], sortBy: CoachSortOption): Coach[] => {
    const result = [...coaches]; // Immutable pattern

    switch (sortBy) {
      case "name":
        return result.sort((a, b) => {
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });

      case "lastContact":
        return result.sort((a, b) => {
          const dateA = a.last_contact_date
            ? new Date(a.last_contact_date).getTime()
            : 0;
          const dateB = b.last_contact_date
            ? new Date(b.last_contact_date).getTime()
            : 0;
          return dateB - dateA; // Most recent first
        });

      case "responsiveness":
        return result.sort((a, b) => {
          const scoreA = a.responsiveness_score || 0;
          const scoreB = b.responsiveness_score || 0;
          return scoreB - scoreA; // Highest responsiveness first
        });

      default:
        return result;
    }
  };

  /**
   * Applies all filters and sorting in sequence
   */
  const applyFiltersAndSort = (
    coaches: Coach[],
    search: string,
    role: string,
    sortBy: CoachSortOption,
  ): Coach[] => {
    let result = filterBySearch(coaches, search);
    result = filterByRole(result, role);
    result = sortCoaches(result, sortBy);
    return result;
  };

  return {
    filterBySearch,
    filterByRole,
    sortCoaches,
    applyFiltersAndSort,
  };
};
