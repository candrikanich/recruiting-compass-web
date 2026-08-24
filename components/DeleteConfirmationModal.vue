<template>
  <Transition name="fade">
    <dialog
      v-if="isOpen"
      ref="dialogRef"
      class="mx-auto max-w-sm rounded-lg border border-red-200 bg-white p-6 shadow-lg backdrop:bg-black/50"
      role="alertdialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-message"
      data-test="delete-modal"
      @cancel.prevent="handleCancel"
    >
      <div class="space-y-4">
        <h2 id="delete-title" class="text-lg font-bold text-red-600">
          Delete {{ itemType }}?
        </h2>

        <p id="delete-message" class="text-gray-700">
          This will permanently delete <strong>{{ itemName }}</strong>
          and any related interactions. This cannot be undone.
        </p>

        <div
          class="flex justify-end gap-3"
          role="group"
          aria-label="Delete confirmation actions"
        >
          <button
            @click="handleCancel"
            :disabled="isLoading"
            aria-label="Cancel deletion"
            data-test="cancel-delete-btn"
            class="rounded-sm border border-gray-300 px-4 py-2 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="handleConfirm"
            :disabled="isLoading"
            aria-label="Confirm permanent deletion"
            data-test="confirm-delete-btn"
            class="flex items-center gap-2 rounded-sm bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <span v-if="isLoading" aria-live="polite">Deleting...</span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
    </dialog>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    itemName: string;
    itemType: "coach" | "school";
    isLoading?: boolean;
  }>(),
  {
    isLoading: false,
  },
);

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);

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

const handleCancel = () => emit("cancel");
const handleConfirm = () => emit("confirm");
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
