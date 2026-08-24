<template>
  <Transition name="fade">
    <dialog
      v-if="isOpen"
      ref="dialogRef"
      class="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl backdrop:bg-black/50"
      :class="borderClass"
      role="dialog"
      :aria-labelledby="titleId"
      :aria-describedby="messageId"
      @cancel.prevent="handleCancel"
    >
      <div class="mb-4">
        <h2 :id="titleId" class="text-lg font-semibold text-slate-900">
          {{ title }}
        </h2>
        <p :id="messageId" class="mt-1 text-sm text-slate-600">
          {{ message }}
        </p>
      </div>

      <div class="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          @click="handleCancel"
          class="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          @click="handleConfirm"
          class="rounded-lg px-4 py-2 font-medium transition focus:ring-2 focus:ring-offset-2"
          :class="confirmButtonClass"
        >
          {{ confirmText }}
        </button>
      </div>
    </dialog>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";

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

const dialogRef = ref<HTMLDialogElement | null>(null);

const titleId = "confirm-dialog-title";
const messageId = "confirm-dialog-message";

// Call showModal() when the dialog element mounts so it renders in the top
// layer with a native backdrop and built-in focus trapping.
watch(
  dialogRef,
  async (el) => {
    if (el) {
      await nextTick();
      el.showModal?.();
    }
  },
  { flush: "post" },
);

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

const handleConfirm = () => emit("confirm");
const handleCancel = () => emit("cancel");
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
