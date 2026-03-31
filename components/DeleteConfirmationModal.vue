<template>
  <Transition name="fade">
    <dialog
      v-if="isOpen"
      ref="dialogRef"
      class="rounded-lg shadow-lg p-6 max-w-sm mx-auto border border-red-200 bg-white backdrop:bg-black/50"
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
          class="flex gap-3 justify-end"
          role="group"
          aria-label="Delete confirmation actions"
        >
          <button
            @click="handleCancel"
            :disabled="isLoading"
            aria-label="Cancel deletion"
            data-test="cancel-delete-btn"
            class="px-4 py-2 rounded-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            @click="handleConfirm"
            :disabled="isLoading"
            aria-label="Confirm permanent deletion"
            data-test="confirm-delete-btn"
            class="px-4 py-2 rounded-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
