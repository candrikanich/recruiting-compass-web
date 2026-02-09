/**
 * Helper utilities for coach data manipulation
 */

import type { Coach, School } from "~/types/models";

/**
 * Get initials from coach name
 */
export const getInitials = (coach: Coach): string => {
  return `${coach.first_name[0]}${coach.last_name[0]}`.toUpperCase();
};

/**
 * Find school by ID from schools array
 */
export const getSchoolById = (
  schoolId: string | undefined,
  schools: School[],
): School | undefined => {
  if (!schoolId) return undefined;
  return schools.find((s) => s.id === schoolId);
};

/**
 * Get school name by ID, with fallback
 */
export const getSchoolName = (
  schoolId: string | undefined,
  schools: School[],
): string => {
  const school = getSchoolById(schoolId, schools);
  return school?.name || "Unknown";
};
