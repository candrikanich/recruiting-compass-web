<template>
  <div v-if="hasActiveFilters" class="mt-4 border-t border-slate-200 pt-4">
    <div
      class="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Active filters"
    >
      <span class="text-sm font-medium text-slate-700">
        Active filters ({{ activeFilterCount }}):
      </span>

      <!-- Search chip -->
      <button
        v-if="filterValues.get('search')"
        @click="emit('remove:filter', 'search')"
        :aria-label="`Remove search filter: ${filterValues.get('search')}`"
        class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Search: {{ filterValues.get("search") }}
        <UIcon name="i-heroicons-x-mark" class="h-3 w-3" aria-hidden="true" />
      </button>

      <!-- Role chip -->
      <button
        v-if="filterValues.get('role')"
        @click="emit('remove:filter', 'role')"
        :aria-label="`Remove role filter: ${getRoleLabel(filterValues.get('role') as string)}`"
        class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Role: {{ getRoleLabel(filterValues.get("role") as string) }}
        <UIcon name="i-heroicons-x-mark" class="h-3 w-3" aria-hidden="true" />
      </button>

      <!-- Last Contact chip -->
      <button
        v-if="filterValues.get('lastContact')"
        @click="emit('remove:filter', 'lastContact')"
        :aria-label="`Remove last contact filter: Last ${filterValues.get('lastContact')} days`"
        class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Last {{ filterValues.get("lastContact") }} days
        <UIcon name="i-heroicons-x-mark" class="h-3 w-3" aria-hidden="true" />
      </button>

      <!-- Clear all button -->
      <button
        @click="emit('clear:all')"
        aria-label="Clear all active filters"
        class="ml-2 text-xs text-slate-600 underline hover:text-slate-900 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
      >
        Clear all
      </button>
    </div>

    <!-- Announce filter change -->
    <div role="status" aria-live="polite" aria-atomic="false" class="sr-only">
      {{ filteredCount }} coach{{ filteredCount !== 1 ? "es" : "" }} found with
      current filters
    </div>
  </div>
</template>

<script setup lang="ts">
import { getRoleLabel } from "~/utils/coachLabels";

interface Props {
  filterValues: Map<string, string | null>;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  filteredCount: number;
}

interface Emits {
  (e: "remove:filter", field: string): void;
  (e: "clear:all"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
</script>
