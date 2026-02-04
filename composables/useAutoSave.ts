// composables/useAutoSave.ts
import { ref } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { useToast } from "./useToast";

export interface AutoSaveOptions {
  debounceMs?: number;
  onSave: () => Promise<void>;
  onError?: (error: Error) => void;
}

export const useAutoSave = (options: AutoSaveOptions) => {
  const { debounceMs = 500, onSave, onError } = options;
  const { showToast } = useToast();

  const isSaving = ref(false);
  const lastSaveTime = ref<Date | null>(null);
  const saveError = ref<Error | null>(null);

  // Debounced save function
  const performSave = useDebounceFn(async () => {
    isSaving.value = true;
    saveError.value = null;

    try {
      await onSave();
      lastSaveTime.value = new Date();
      showToast("Saved ✓", "success", 2000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      saveError.value = err;
      showToast(`Failed to save: ${err.message}`, "error");
      if (onError) {
        onError(err);
      }
    } finally {
      isSaving.value = false;
    }
  }, debounceMs);

  const triggerSave = () => {
    performSave();
  };

  return {
    isSaving,
    lastSaveTime,
    saveError,
    triggerSave,
  };
};
