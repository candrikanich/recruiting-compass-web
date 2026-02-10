import type { Ref } from "vue";

/**
 * Creates a handler function that automatically updates local state after an async operation
 * Reduces repetitive "update and refresh" pattern throughout detail pages
 *
 * @param stateRef - Ref to the local state that should be updated
 * @param updateFn - Async function that performs the update and returns updated value
 * @returns Handler function that updates state automatically if operation succeeds
 *
 * @example
 * const school = ref<School | null>(null);
 * const handleStatusUpdate = createUpdateHandler(school, updateStatus);
 * const handlePriorityUpdate = createUpdateHandler(school, updatePriority);
 *
 * // Usage:
 * await handleStatusUpdate("contacted"); // school.value auto-updated
 * await handlePriorityUpdate("A");       // school.value auto-updated
 */
export function createUpdateHandler<T, Args extends unknown[]>(
  stateRef: Ref<T | null>,
  updateFn: (...args: Args) => Promise<T | null>,
) {
  return async (...args: Args): Promise<T | null> => {
    const updated = await updateFn(...args);
    if (updated) {
      stateRef.value = updated;
    }
    return updated;
  };
}
