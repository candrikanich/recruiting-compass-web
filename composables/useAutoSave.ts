// composables/useAutoSave.ts
import { ref, onBeforeUnmount } from "vue";
import { useAppToast } from "./useAppToast";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useAutoSave");

export interface AutoSaveOptions {
  debounceMs?: number;
  onSave: () => Promise<void>;
  onError?: (error: Error) => void;
}

export const useAutoSave = (options: AutoSaveOptions) => {
  const { debounceMs = 500, onSave, onError } = options;
  const { showToast } = useAppToast();

  const isSaving = ref(false);
  const lastSaveTime = ref<Date | null>(null);
  const saveError = ref<Error | null>(null);

  // Own debounce (setTimeout-based) instead of useDebounceFn: we need to be
  // able to detect and flush a still-pending save on unmount, which
  // useDebounceFn's returned function doesn't expose a way to do.
  let pendingTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const doSave = async () => {
    isSaving.value = true;
    saveError.value = null;

    try {
      await onSave();
      lastSaveTime.value = new Date();
      showToast("Saved ✓", "success", 2000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      saveError.value = err;
      logger.error("Auto-save failed", err);
      // Never surface raw error/Postgres text to the user — log it for
      // debugging (via onError/logger) and show a generic, actionable message.
      showToast(
        "Something went wrong saving your changes. Please try again.",
        "error",
      );
      if (onError) {
        onError(err);
      }
    } finally {
      isSaving.value = false;
    }
  };

  const triggerSave = () => {
    if (pendingTimeoutId !== null) {
      clearTimeout(pendingTimeoutId);
    }
    pendingTimeoutId = setTimeout(() => {
      pendingTimeoutId = null;
      void doSave();
    }, debounceMs);
  };

  // Navigating away within the debounce window previously lost the edit
  // silently — an "auto-save" that never actually saves on unmount. Flush
  // any pending debounced save immediately instead of dropping it.
  onBeforeUnmount(() => {
    if (pendingTimeoutId !== null) {
      clearTimeout(pendingTimeoutId);
      pendingTimeoutId = null;
      void doSave();
    }
  });

  return {
    isSaving,
    lastSaveTime,
    saveError,
    triggerSave,
  };
};
