import { ref } from "vue";

/**
 * Reusable composable for delete confirmation modal pattern
 * Used across coach, school, and interaction detail pages
 *
 * @param deleteFn - Async function that performs the deletion
 * @returns Modal state and control functions
 *
 * @example
 * const { isOpen, isDeleting, open, close, confirm } = useDeleteModal(
 *   async (id: string) => await deleteCoach(id)
 * );
 *
 * // In template:
 * <button @click="open">Delete</button>
 * <DeleteModal :is-open="isOpen" :is-loading="isDeleting" @confirm="confirm" @cancel="close" />
 */
export function useDeleteModal<T = string>(
  deleteFn: (id: T) => Promise<void | unknown>,
) {
  const isOpen = ref(false);
  const isDeleting = ref(false);

  const open = () => {
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
  };

  const confirm = async (id: T, onSuccess?: () => void) => {
    isDeleting.value = true;
    try {
      await deleteFn(id);
      close();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      isDeleting.value = false;
      throw error; // Re-throw so caller can handle error display
    } finally {
      isDeleting.value = false;
    }
  };

  return {
    isOpen,
    isDeleting,
    open,
    close,
    confirm,
  };
}
