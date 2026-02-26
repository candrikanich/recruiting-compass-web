// composables/useAutoSave.ts
import { ref, onBeforeUnmount } from "vue";
import { debounce } from "~/utils/debounce";
import { useToast } from "./useToast";

export interface AutoSaveOptions {
  debounceMs?: number;
  onSave: () => Promise<void>;
  onError?: (error: Error) => void;
}

export const useAutoSave = (options: AutoSaveOptions) => {
  const { debounceMs = 500, onSave, onError } = options;
  let isMounted = true;
  onBeforeUnmount(() => {
    isMounted = false;
  });
  const { showToast } = useToast();

  const isSaving = ref(false);
  const lastSaveTime = ref<Date | null>(null);
  const saveError = ref<Error | null>(null);

  // Debounced save function
  const performSave = debounce(async () => {
    if (!isMounted) return;
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
