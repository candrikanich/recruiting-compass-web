<template>
  <dialog v-if="isOpen" class="rounded-lg shadow-lg p-6 max-w-sm mx-auto">
    <div class="space-y-4">
      <h2 class="text-lg font-bold text-red-600">Delete {{ itemType }}?</h2>

      <p class="text-gray-700">
        This will permanently delete <strong>{{ itemName }}</strong>
        and any related interactions. This cannot be undone.
      </p>

      <div class="flex gap-3 justify-end">
        <button
          @click="$emit('cancel')"
          :disabled="isLoading"
          class="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          @click="$emit('confirm')"
          :disabled="isLoading"
          class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
        >
          <span v-if="isLoading">Deleting...</span>
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
