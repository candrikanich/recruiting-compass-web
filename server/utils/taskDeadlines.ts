/**
 * Compute a task's deadline from the athlete's graduation year and a per-task
 * offset (months before graduation the task is due).
 *
 * Graduation anchor is June 1 of the graduation year. The result is the anchor
 * minus `offsetMonths`, returned as a `YYYY-MM-DD` string (day pinned to the
 * 1st). Returns null when either input is missing — callers render no badge.
 *
 * Pure integer month arithmetic (no Date/timezone) keeps it total and stable.
 */
const GRADUATION_ANCHOR_MONTH = 6; // June (1-indexed)

export function computeTaskDeadline(
  graduationYear: number | null,
  offsetMonths: number | null,
): string | null {
  if (graduationYear == null || offsetMonths == null) return null;

  // Work in 0-indexed absolute months since year 0.
  const anchorAbsMonth = graduationYear * 12 + (GRADUATION_ANCHOR_MONTH - 1);
  const targetAbsMonth = anchorAbsMonth - offsetMonths;

  const year = Math.floor(targetAbsMonth / 12);
  const month = (targetAbsMonth % 12) + 1; // back to 1-indexed

  const mm = String(month).padStart(2, "0");
  return `${year}-${mm}-01`;
}
