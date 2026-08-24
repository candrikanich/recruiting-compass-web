<template>
  <div>
    <label class="mb-1 block text-sm font-medium text-slate-700">Sort By</label>
    <div class="flex gap-2">
      <select
        :value="modelValue"
        @change="
          $emit('update:modelValue', ($event.target as HTMLSelectElement).value)
        "
        class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      >
        <option value="a-z">A - Z</option>
        <option value="distance">Distance</option>
        <option value="last-contact">Last Contact</option>
      </select>
      <button
        @click="$emit('update:sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')"
        :title="`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`"
        class="flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-slate-600 transition hover:bg-slate-50"
      >
        <svg
          v-if="sortOrder === 'asc'"
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16V4m0 0L3 8m4-4l4 4"
          />
        </svg>
        <svg
          v-else
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 8v12m0 0l-4-4m4 4l4-4"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  sortOrder: "asc" | "desc";
}>();

defineEmits<{
  "update:modelValue": [value: string];
  "update:sortOrder": [value: "asc" | "desc"];
}>();
</script>
