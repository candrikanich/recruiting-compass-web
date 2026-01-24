import { ref, computed } from "vue";
import type { Toast, ToastType } from "~/types/toast";

export const useToast = () => {
  const toasts = ref<Toast[]>([]);

  const showToast = (
    message: string,
    type: ToastType = "info",
    duration = 5000,
  ) => {
    const id = Date.now().toString() + Math.random();
    toasts.value.push({ id, message, type });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  const clearAll = () => {
    toasts.value = [];
  };

  return {
    toasts: computed(() => toasts.value),
    showToast,
    removeToast,
    clearAll,
  };
};
