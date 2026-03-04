<script setup lang="ts">
interface Emits {
  (e: "export"): void;
  (e: "delete"): void;
}

defineEmits<Emits>();
</script>

<template>
  <div class="flex gap-2">
    <button
      type="button"
      @click="$emit('export')"
      aria-label="Export interaction to CSV file"
      class="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <span aria-hidden="true">📤</span>
      <span class="ml-1">Export</span>
    </button>
    <button
      type="button"
      @click="$emit('delete')"
      aria-label="Delete this interaction permanently"
      class="px-4 py-2 bg-red-500 text-white rounded-sm hover:bg-red-600 transition focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      <span aria-hidden="true">🗑️</span>
      <span class="ml-1">Delete</span>
    </button>
  </div>
</template>
