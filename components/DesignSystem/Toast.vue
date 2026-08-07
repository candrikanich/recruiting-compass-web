<template>
  <ClientOnly>
    <Teleport to="body">
      <div
        class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        <TransitionGroup name="toast">
          <div
            v-for="toast in toasts"
            :key="toast.id"
            :role="getToastRole(toast.type)"
            :aria-live="getAriaLive(toast.type)"
            aria-atomic="true"
            :class="[
              'pointer-events-auto px-4 py-3 rounded-lg text-white',
              toastClass(toast.type),
            ]"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-heroicons-check-solid"
                  v-if="toast.type === 'success'"
                  class="w-5 h-5"
                  aria-hidden="true"
                />
                <UIcon
                  name="i-heroicons-x-mark-solid"
                  v-else-if="toast.type === 'error'"
                  class="w-5 h-5"
                  aria-hidden="true"
                />
                <span v-else class="text-lg" aria-hidden="true">{{
                  getToastIcon(toast.type)
                }}</span>
                <p class="text-sm font-medium">{{ toast.message }}</p>
              </div>
              <button
                v-if="toast.action"
                @click="runAction(toast)"
                :aria-label="`${toast.action.label}: ${toast.message}`"
                class="text-sm font-semibold underline underline-offset-2 hover:opacity-80 transition focus:ring-2 focus:ring-white focus:ring-offset-2 whitespace-nowrap"
              >
                {{ toast.action.label }}
              </button>
              <button
                @click="removeToast(toast.id)"
                :aria-label="`Dismiss ${toast.type} notification: ${toast.message}`"
                class="hover:opacity-70 transition focus:ring-2 focus:ring-white focus:ring-offset-2"
              >
                <UIcon
                  name="i-heroicons-x-mark-solid"
                  class="w-5 h-5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { useAppToast } from "~/composables/useAppToast";
import type { Toast, ToastType } from "~/types/toast";

const { toasts, removeToast } = useAppToast();

const runAction = async (toast: Toast) => {
  removeToast(toast.id);
  await toast.action?.handler();
};

const toastClass = (type: ToastType): string => {
  const colors: Record<ToastType, string> = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    warning: "bg-orange-500",
    info: "bg-blue-500",
  };
  return `${colors[type]} shadow-lg`;
};

const getToastIcon = (type: ToastType): string => {
  const icons: Record<ToastType, string> = {
    success: "check",
    error: "xmark",
    warning: "⚠",
    info: "ℹ",
  };
  return icons[type];
};

const getToastRole = (type: ToastType): string => {
  return type === "error" ? "alert" : "status";
};

const getAriaLive = (type: ToastType): "assertive" | "polite" => {
  return type === "error" ? "assertive" : "polite";
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
