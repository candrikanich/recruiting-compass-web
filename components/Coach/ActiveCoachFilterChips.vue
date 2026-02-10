<template>
  <div v-if="hasActiveFilters" class="mt-4 pt-4 border-t border-slate-200">
    <div
      class="flex items-center gap-2 flex-wrap"
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
        class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Search: {{ filterValues.get("search") }}
        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
      </button>

      <!-- Role chip -->
      <button
        v-if="filterValues.get('role')"
        @click="emit('remove:filter', 'role')"
        :aria-label="`Remove role filter: ${getRoleLabel(filterValues.get('role') as string)}`"
        class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Role: {{ getRoleLabel(filterValues.get("role") as string) }}
        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
      </button>

      <!-- Last Contact chip -->
      <button
        v-if="filterValues.get('lastContact')"
        @click="emit('remove:filter', 'lastContact')"
        :aria-label="`Remove last contact filter: Last ${filterValues.get('lastContact')} days`"
        class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Last {{ filterValues.get("lastContact") }} days
        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
      </button>

      <!-- Responsiveness chip -->
      <button
        v-if="filterValues.get('responsiveness')"
        @click="emit('remove:filter', 'responsiveness')"
        :aria-label="`Remove responsiveness filter: ${getResponsivenessFilterLabel(filterValues.get('responsiveness') as string)}`"
        class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {{
          getResponsivenessFilterLabel(
            filterValues.get("responsiveness") as string,
          )
        }}
        <XMarkIcon class="w-3 h-3" aria-hidden="true" />
      </button>

      <!-- Clear all button -->
      <button
        @click="emit('clear:all')"
        aria-label="Clear all active filters"
        class="text-xs text-slate-600 hover:text-slate-900 underline ml-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
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
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { getRoleLabel } from "~/utils/coachLabels";
import { getResponsivenessFilterLabel } from "~/utils/coachFormatters";

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
