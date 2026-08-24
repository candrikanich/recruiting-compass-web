import { ref, type Ref } from "vue";
import type { PlayerDetails } from "~/types/models";

/**
 * Core-courses list editing for the player-details form. Mutates the shared
 * `form` ref and triggers an autosave on every change (add dedupes case-exactly
 * and ignores blanks). Extracted from usePlayerDetailsForm.
 */
export function useCoreCourses(
  form: Ref<PlayerDetails>,
  triggerSave: () => void,
) {
  const newCourseInput = ref("");

  const addCourse = (): void => {
    const trimmed = newCourseInput.value.trim();
    if (!trimmed || form.value.core_courses?.includes(trimmed)) return;
    form.value.core_courses = [...(form.value.core_courses ?? []), trimmed];
    newCourseInput.value = "";
    triggerSave();
  };

  const removeCourse = (idx: number): void => {
    form.value.core_courses = (form.value.core_courses ?? []).filter(
      (_, i) => i !== idx,
    );
    triggerSave();
  };

  return { newCourseInput, addCourse, removeCourse };
}
