/**
 * Shared helpers for the athlete phase read/advance endpoints.
 *
 * `users.current_phase` is the single source of truth for an athlete's phase once
 * they've advanced at least once. It has no DB default (see migration
 * `20260727000002_phase_system_repair.sql`) — `NULL` means "never advanced", in
 * which case callers should fall back to a grade-derived phase computed from
 * `graduation_year`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";
import type { Phase } from "~/types/timeline";
import type { TaskIdsBySlug } from "~/utils/phaseCalculation";
import { calculateCurrentGrade } from "~/utils/gradeHelpers";

/**
 * Map grade level (9-12) to the grade-derived default phase.
 */
export function gradeToPhase(grade: number): Phase {
  if (grade === 9) return "freshman";
  if (grade === 10) return "sophomore";
  if (grade === 11) return "junior";
  if (grade === 12) return "senior";
  // Default to freshman if grade is out of range
  return "freshman";
}

/**
 * Compute the grade-derived default phase from a (possibly absent) graduation year.
 * Pure — callers own their own DB fetch/error handling for `graduation_year`.
 */
export function computePhaseFromGraduationYear(
  graduationYear: number | null,
): Phase {
  if (!graduationYear) {
    return "freshman";
  }
  return gradeToPhase(calculateCurrentGrade(graduationYear));
}

/**
 * Build a `task.slug` -> `task.id` lookup map for resolving `PHASE_MILESTONES`
 * slugs to real seeded task ids.
 */
export async function getTaskIdsBySlug(
  supabase: SupabaseClient<Database>,
): Promise<TaskIdsBySlug> {
  const { data, error } = await supabase
    .from("task")
    .select("id, slug")
    .not("slug", "is", null);

  if (error) {
    throw error;
  }

  const taskIdsBySlug: TaskIdsBySlug = {};
  for (const row of data ?? []) {
    const slug = (row as { id: string; slug: string | null }).slug;
    const id = (row as { id: string; slug: string | null }).id;
    if (slug) {
      taskIdsBySlug[slug] = id;
    }
  }
  return taskIdsBySlug;
}
