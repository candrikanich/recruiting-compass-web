import { ref, type Ref } from "vue";

/**
 * Composable for managing notes editing state and operations
 * Handles edit mode, unsaved changes, and save/cancel logic
 */
export const useNotesEditor = (initialValue: Ref<string>) => {
  const isEditing = ref(false);
  const editedValue = ref(initialValue.value);
  const isSaving = ref(false);

  /**
   * Start editing mode and initialize edited value
   */
  const startEdit = () => {
    editedValue.value = initialValue.value;
    isEditing.value = true;
  };

  /**
   * Cancel editing and revert to initial value
   */
  const cancelEdit = () => {
    editedValue.value = initialValue.value;
    isEditing.value = false;
  };

  /**
   * Save the edited value using the provided save function
   * @param saveFn - Async function that performs the save operation
   * @returns Promise that resolves when save is complete
   */
  const save = async (saveFn: (value: string) => Promise<void>) => {
    isSaving.value = true;
    try {
      await saveFn(editedValue.value);
      isEditing.value = false;
    } finally {
      isSaving.value = false;
    }
  };

  /**
   * Toggle edit mode
   */
  const toggleEdit = () => {
    if (isEditing.value) {
      cancelEdit();
    } else {
      startEdit();
    }
  };

  return {
    isEditing,
    editedValue,
    isSaving,
    startEdit,
    cancelEdit,
    save,
    toggleEdit,
  };
};
