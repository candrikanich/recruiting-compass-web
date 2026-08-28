<template>
  <div v-if="hasActiveFilters" class="filter-chips">
    <div class="flex flex-wrap items-center gap-2">
      <!-- Active filter chips -->
      <div
        v-for="(value, field) in activeFilters"
        :key="field"
        class="inline-flex items-center gap-2 rounded-full bg-brand-blue-100 px-3 py-1.5 text-sm text-brand-blue-700 transition-all hover:bg-brand-blue-200"
      >
        <span class="font-medium">{{ getLabel(field) }}:</span>
        <span>{{ getDisplayValue(field, value) }}</span>
        <button
          type="button"
          class="ml-1 text-brand-blue-700 transition-colors hover:text-brand-blue-900"
          :aria-label="`Remove ${getLabel(field)} filter`"
          @click="removeFilter(field)"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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
        class="rounded-full bg-brand-slate-100 px-2 py-1 text-xs font-semibold text-brand-slate-600"
      >
        {{ activeFilterCount }} filter<span v-if="activeFilterCount !== 1"
          >s</span
        >
      </span>

      <!-- Clear all button -->
      <button
        type="button"
        class="ml-2 text-xs font-medium text-brand-slate-600 transition-colors hover:text-brand-slate-900"
        @click="clearAll"
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
  filterValues: FilterValues;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  getDisplayValue: (field: string, value: unknown) => string;
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
