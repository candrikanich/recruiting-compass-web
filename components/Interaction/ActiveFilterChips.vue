<template>
  <div
    v-if="hasActiveFilters"
    class="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 flex-wrap"
  >
    <span class="text-sm text-slate-500">Active filters:</span>
    <button
      v-if="filterValues.get('search')"
      @click="handleRemove('search')"
      class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
    >
      Search: {{ filterValues.get("search") }}
      <XMarkIcon class="w-3 h-3" />
    </button>
    <button
      v-if="filterValues.get('type')"
      @click="handleRemove('type')"
      class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
    >
      Type: {{ formatType(filterValues.get("type") as string) }}
      <XMarkIcon class="w-3 h-3" />
    </button>
    <button
      v-if="filterValues.get('loggedBy')"
      @click="handleRemove('loggedBy')"
      class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
    >
      Logged By:
      {{ formatLoggedBy(filterValues.get("loggedBy") as string) }}
      <XMarkIcon class="w-3 h-3" />
    </button>
    <button
      v-if="filterValues.get('direction')"
      @click="handleRemove('direction')"
      class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
    >
      {{ formatDirection(filterValues.get("direction") as string) }}
      <XMarkIcon class="w-3 h-3" />
    </button>
    <button
      v-if="filterValues.get('sentiment')"
      @click="handleRemove('sentiment')"
      class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
    >
      {{ formatSentiment(filterValues.get("sentiment") as string) }}
      <XMarkIcon class="w-3 h-3" />
    </button>
    <button
      v-if="filterValues.get('timePeriod')"
      @click="handleRemove('timePeriod')"
      class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
    >
      Last {{ filterValues.get("timePeriod") }} days
      <XMarkIcon class="w-3 h-3" />
    </button>
    <button
      @click="handleClearAll"
      class="text-xs text-slate-500 hover:text-slate-700 underline ml-2"
    >
      Clear all
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import type { User } from "~/types/models";
import {
  formatType,
  formatDirection,
  formatSentiment,
} from "~/utils/interactionFormatters";

interface Props {
  filterValues: Map<string, string | null>;
  linkedAthletes: User[];
  currentUserId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  currentUserId: undefined,
});

interface Emits {
  (e: "remove:filter", payload: { field: string }): void;
  (e: "clear:all"): void;
}

const emit = defineEmits<Emits>();

const hasActiveFilters = computed(() => {
  for (const [, value] of props.filterValues) {
    if (value) return true;
  }
  return false;
});

const formatLoggedBy = (userId: string): string => {
  if (props.currentUserId === userId) {
    return "Me (Parent)";
  }
  const athlete = props.linkedAthletes.find((a) => a.id === userId);
  return athlete?.full_name || "Unknown";
};

const handleRemove = (field: string): void => {
  emit("remove:filter", { field });
};

const handleClearAll = (): void => {
  emit("clear:all");
};
</script>
