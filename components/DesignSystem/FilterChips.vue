<template>
  <div v-if="hasActiveFilters" class="filter-chips">
    <div class="flex flex-wrap gap-2 items-center">
      <!-- Active filter chips -->
      <div
        v-for="(value, field) in activeFilters"
        :key="field"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all bg-blue-100 text-blue-700 hover:bg-blue-200"
      >
        <span class="font-medium">{{ getLabel(field) }}:</span>
        <span>{{ getDisplayValue(field, value) }}</span>
        <button
          @click="removeFilter(field)"
          class="ml-1 transition-colors text-blue-700 hover:text-blue-900"
          aria-label="Remove filter"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <!-- Active filter count -->
      <span
        class="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600"
      >
        {{ activeFilterCount }} filter<span v-if="activeFilterCount !== 1"
          >s</span
        >
      </span>

      <!-- Clear all button -->
      <button
        @click="clearAll"
        class="text-xs font-medium transition-colors ml-2 text-slate-600 hover:text-slate-900"
      >
        Clear all
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { FilterConfig, FilterValues } from "~/types/filters";

interface Props {
  configs: FilterConfig[];
  filterValues: Record<string, any>;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  getDisplayValue: (field: string, value: any) => string;
}

interface Emits {
  (e: "remove-filter", field: string): void;
  (e: "clear-all"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Get active filters (non-null values)
const activeFilters = computed(() => {
  const active: FilterValues = {};
  Object.entries(props.filterValues).forEach(([field, value]) => {
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    ) {
      active[field] = value;
    }
  });
  return active;
});

// Get label for a field
const getLabel = (field: string): string => {
  const config = props.configs.find((c) => c.field === field);
  return config?.label || field;
};

// Remove a single filter
const removeFilter = (field: string) => {
  emit("remove-filter", field);
};

// Clear all filters
const clearAll = () => {
  emit("clear-all");
};
</script>
