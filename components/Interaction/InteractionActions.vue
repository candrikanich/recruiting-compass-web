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
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
    >
      📤 Export
    </button>
    <button
      type="button"
      @click="$emit('delete')"
      class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
    >
      🗑️ Delete
    </button>
  </div>
</template>
