<template>
  <div class="group">
    <label
      :for="selectId"
      class="mb-2 block text-xs font-semibold tracking-wide text-slate-500 uppercase"
    >
      {{ label }}
    </label>
    <select
      :id="selectId"
      :value="value"
      @change="$emit('change', ($event.target as HTMLSelectElement).value)"
      class="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      :style="selectStyle"
    >
      <slot />
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  label: string;
  value: string;
  id?: string;
}>();

defineEmits<{
  change: [value: string];
}>();

const selectId = computed(
  () => props.id || `filter-${props.label.toLowerCase().replace(/\s+/g, "-")}`,
);

const selectStyle =
  'background-image: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%236b7280%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3E%3C/svg%3E"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2rem;';
</script>
