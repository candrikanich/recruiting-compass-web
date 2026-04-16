<template>
  <Transition name="fade">
    <dialog
      v-if="isOpen"
      ref="dialogRef"
      class="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 backdrop:bg-black/50"
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
        <p :id="messageId" class="text-sm text-slate-600 mt-1">
          {{ message }}
        </p>
      </div>

      <div class="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <button
          type="button"
          @click="handleCancel"
          class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          @click="handleConfirm"
          class="px-4 py-2 rounded-lg font-medium transition focus:ring-2 focus:ring-offset-2"
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
