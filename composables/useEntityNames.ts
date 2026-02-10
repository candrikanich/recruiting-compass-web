import { useSchools } from "./useSchools";
import { useCoaches } from "./useCoaches";

/**
 * useEntityNames composable
 *
 * Provides reactive functions for resolving entity IDs to human-readable names.
 * Uses useSchools and useCoaches internally to keep data in sync.
 *
 * Example:
 * ```typescript
 * const { getSchoolName, getCoachName } = useEntityNames();
 * const schoolName = getSchoolName(schoolId); // "Stanford University"
 * const coachName = getCoachName(coachId);   // "John Smith"
 * ```
 */
export const useEntityNames = (): {
  getSchoolName: (schoolId?: string) => string;
  getCoachName: (coachId?: string) => string;
  formatCoachName: (firstName?: string, lastName?: string) => string;
} => {
  const { schools } = useSchools();
  const { coaches } = useCoaches();

  /**
   * Resolve school ID to school name
   * Returns "Unknown" if school not found or ID is falsy
   */
  const getSchoolName = (schoolId?: string): string => {
    if (!schoolId) return "Unknown";
    const school = schools.value.find((s) => s.id === schoolId);
    return school?.name || "Unknown";
  };

  /**
   * Resolve coach ID to formatted coach name (First Last)
   * Returns "Unknown" if coach not found or ID is falsy
   */
  const getCoachName = (coachId?: string): string => {
    if (!coachId) return "Unknown";
    const coach = coaches.value.find((c) => c.id === coachId);
    if (!coach) return "Unknown";
    const name = `${coach.first_name || ""} ${coach.last_name || ""}`.trim();
    return name || "Unknown";
  };

  /**
   * Format coach name from separate first/last name fields
   * Handles missing names gracefully
   */
  const formatCoachName = (firstName?: string, lastName?: string): string => {
    const name = `${firstName || ""} ${lastName || ""}`.trim();
    return name || "Unknown";
  };

  return {
    getSchoolName,
    getCoachName,
    formatCoachName,
  };
};
