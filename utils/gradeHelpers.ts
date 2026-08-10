/**
 * Calculate the current grade level based on graduation year
 * Returns grade 9-12, representing freshman through senior
 *
 * Uses a July 1 roll pivot: during summer break (July–August) an athlete is
 * treated as the grade they are rising INTO, matching the recruiting cycle
 * (e.g. NCAA D1 baseball contact opens Aug 1 before junior year — a rising
 * junior is already recruited as a junior). June still counts the just-finished
 * grade while the prior school year winds down.
 *
 * @param graduationYear The year the student will graduate
 * @returns Current grade level (9-12)
 */
export function calculateCurrentGrade(graduationYear: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

  // The "school year end year" is the calendar year the athlete's current
  // school year ends (spring). With a July 1 roll pivot:
  // Jan-Jun: still in the school year that ends this calendar year
  // Jul-Dec: rising into the school year that ends next calendar year
  const schoolYearEndYear = currentMonth >= 7 ? currentYear + 1 : currentYear;

  // Calculate grade: 12 - (graduation year - school year end year)
  // For example: Jan 2026, grad 2027 => 12 - (2027 - 2026) = 11 (junior)
  // For example: Aug 2026, grad 2027 => 12 - (2027 - 2027) = 12 (rising senior)
  const calculatedGrade = 12 - (graduationYear - schoolYearEndYear);

  // Clamp between 9 (freshman) and 12 (senior)
  return Math.max(9, Math.min(12, calculatedGrade));
}
