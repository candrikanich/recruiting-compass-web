import type { School } from "~/types/models";

/**
 * Get a specific academic info field from a school
 * @param school - The school object
 * @param key - The academic info field key
 * @returns The value of the field or null if not found
 */
export const getAcademicInfo = (
  school: School | null,
  key: string,
): unknown => {
  if (!school?.academic_info) return null;
  return school.academic_info[key] ?? null;
};

/**
 * Check if school has any school information fields
 */
export const hasSchoolInfo = (school: School | null): boolean => {
  if (!school?.academic_info) return false;
  return !!(
    school.academic_info.address ||
    school.academic_info.baseball_facility_address ||
    school.academic_info.mascot ||
    school.academic_info.undergrad_size
  );
};

/**
 * Check if school has any contact/social info
 */
export const hasContactInfo = (school: School | null): boolean => {
  if (!school) return false;
  return !!(school.website || school.twitter_handle);
};

/**
 * Check if school has any college scorecard data
 */
export const hasCollegeScorecardData = (school: School | null): boolean => {
  if (!school?.academic_info) return false;
  return !!(
    school.academic_info.student_size ||
    school.academic_info.tuition_in_state ||
    school.academic_info.tuition_out_of_state ||
    school.academic_info.admission_rate
  );
};
