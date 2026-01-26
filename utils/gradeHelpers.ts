/**
 * Calculate the current grade level based on graduation year
 * School year starts in September (month 9) and ends in June
 * Returns grade 9-12, representing freshman through senior
 *
 * @param graduationYear The year the student will graduate
 * @returns Current grade level (9-12)
 */
export function calculateCurrentGrade(graduationYear: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

  // School year runs Sept-June
  // The "current year reference" is the year the school year ends
  // Jan-Aug: school year ends in current year
  // Sept-Dec: school year ends in next year
  const schoolYearEndYear = currentMonth >= 9 ? currentYear + 1 : currentYear;

  // Calculate grade: 12 - (graduation year - school year end year)
  // For example: Jan 2026, grad 2027 => 12 - (2027 - 2026) = 11 (junior)
  // For example: Oct 2026, grad 2027 => 12 - (2027 - 2027) = 12 (senior)
  const calculatedGrade = 12 - (graduationYear - schoolYearEndYear);

  // Clamp between 9 (freshman) and 12 (senior)
  return Math.max(9, Math.min(12, calculatedGrade));
}
