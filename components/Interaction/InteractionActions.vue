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
      class="rounded-sm bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <span aria-hidden="true">📤</span>
      <span class="ml-1">Export</span>
    </button>
    <button
      type="button"
      @click="$emit('delete')"
      aria-label="Delete this interaction permanently"
      class="rounded-sm bg-red-500 px-4 py-2 text-white transition hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      <span aria-hidden="true">🗑️</span>
      <span class="ml-1">Delete</span>
    </button>
  </div>
</template>
