<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @keydown.escape="handleCancel"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
          class="bg-white rounded-lg shadow-2xl max-w-md w-full p-6"
          :class="borderClass"
        >
          <div class="mb-4">
            <h2 :id="titleId" class="text-lg font-semibold text-slate-900">
              {{ title }}
            </h2>
            <p :id="messageId" class="text-sm text-slate-600 mt-1">
              {{ message }}
            </p>
          </div>

          <div class="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              ref="cancelButtonRef"
              type="button"
              @click="handleCancel"
              class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              {{ cancelText }}
            </button>
            <button
              type="button"
              @click="handleConfirm"
              class="px-4 py-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2"
              :class="confirmButtonClass"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";

type DialogVariant = "danger" | "warning";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: DialogVariant;
  }>(),
  {
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "danger",
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const cancelButtonRef = ref<HTMLButtonElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

const titleId = "confirm-dialog-title";
const messageId = "confirm-dialog-message";

const borderClass = computed(() =>
  props.variant === "danger"
    ? "border-l-4 border-red-500"
    : "border-l-4 border-amber-500",
);

const confirmButtonClass = computed(() =>
  props.variant === "danger"
    ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
    : "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500",
);

const handleConfirm = () => {
  deactivate();
  emit("confirm");
};

const handleCancel = () => {
  deactivate();
  emit("cancel");
};

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      activate();
    } else {
      deactivate();
    }
  },
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
