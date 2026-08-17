import type { TaskWithStatus } from "~/types/timeline";

// Keys MUST match the `task.category` values actually stored in the DB
// (academic / recruiting / athletic / exposure / mindset). An earlier map used
// a fictional taxonomy (academic-standing, visibility-building, …) that matched
// no rows, so every task fell to the caller's default — a total tie that made
// the #1 "what matters now" task arbitrary (and different between web and iOS,
// which issue independently-ordered queries).
export const CATEGORY_PRIORITY = {
  academic: 10,
  recruiting: 9,
  athletic: 8,
  exposure: 7,
  mindset: 5,
} as const;

// Sentinel that sorts after every real "YYYY-MM-DD" deadline string, so tasks
// without a deadline land at the bottom of their tier instead of the top.
const NO_DEADLINE = "￿";

// Canonical timeline task ordering — MUST stay identical to the iOS
// TimelineTaskSort comparator. Keys, in order:
//   1. incomplete before completed
//   2. actionable before locked (incomplete prerequisites)
//   3. required before optional
//   4. deadline ascending, null last
//   5. category rank academic>recruiting>athletic>exposure>mindset, unknown last
//   6. title A–Z (deterministic tiebreak)
export function compareTimelineTasks(
  a: TaskWithStatus,
  b: TaskWithStatus,
): number {
  const aDone = a.athlete_task?.status === "completed" ? 1 : 0;
  const bDone = b.athlete_task?.status === "completed" ? 1 : 0;
  if (aDone !== bDone) return aDone - bDone;

  const aLocked = a.has_incomplete_prerequisites ? 1 : 0;
  const bLocked = b.has_incomplete_prerequisites ? 1 : 0;
  if (aLocked !== bLocked) return aLocked - bLocked;

  const aRequired = a.required ? 0 : 1;
  const bRequired = b.required ? 0 : 1;
  if (aRequired !== bRequired) return aRequired - bRequired;

  const aDeadline = a.deadline_date ?? NO_DEADLINE;
  const bDeadline = b.deadline_date ?? NO_DEADLINE;
  if (aDeadline !== bDeadline) return aDeadline < bDeadline ? -1 : 1;

  const priorities = CATEGORY_PRIORITY as Record<string, number>;
  const aCategory = priorities[a.category] ?? 0;
  const bCategory = priorities[b.category] ?? 0;
  if (aCategory !== bCategory) return bCategory - aCategory;

  return a.title.localeCompare(b.title);
}
