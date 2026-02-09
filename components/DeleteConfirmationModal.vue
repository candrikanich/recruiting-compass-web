<template>
  <dialog
    v-if="isOpen"
    class="rounded-lg shadow-lg p-6 max-w-sm mx-auto border border-red-200"
    role="alertdialog"
    aria-labelledby="delete-title"
    aria-describedby="delete-message"
    @close="$emit('cancel')"
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
          @click="$emit('cancel')"
          :disabled="isLoading"
          aria-label="Cancel deletion"
          class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          @click="$emit('confirm')"
          :disabled="isLoading"
          aria-label="Confirm permanent deletion"
          class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <span v-if="isLoading" aria-live="polite">Deleting...</span>
          <span v-else>Delete</span>
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
withDefaults(
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

defineEmits<{
  cancel: [];
  confirm: [];
}>();
</script>
