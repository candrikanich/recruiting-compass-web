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
                <CheckIcon
                  v-if="toast.type === 'success'"
                  class="w-5 h-5"
                  aria-hidden="true"
                />
                <XMarkIcon
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
                @click="removeToast(toast.id)"
                :aria-label="`Dismiss ${toast.type} notification: ${toast.message}`"
                class="hover:opacity-70 transition focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
              >
                <XMarkIcon class="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { useToast } from "~/composables/useToast";
import { XMarkIcon, CheckIcon } from "@heroicons/vue/24/solid";
import type { ToastType } from "~/types/toast";

const { toasts, removeToast } = useToast();

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
