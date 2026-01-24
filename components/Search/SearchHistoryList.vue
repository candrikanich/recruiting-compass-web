<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <svg
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Recent Searches
      </h3>
      <button
        v-if="recentSearches.length > 0"
        @click="clearHistory"
        class="text-xs text-gray-600 hover:text-gray-900 font-medium"
      >
        Clear
      </button>
    </div>

    <!-- Recent Searches -->
    <div v-if="recentSearches.length > 0" class="space-y-2">
      <div
        v-for="search in recentSearches"
        :key="search.id"
        class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition"
        @click="$emit('apply-search', search)"
      >
        <svg
          class="h-4 w-4 text-gray-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            {{ search.query }}
          </p>
          <p class="text-xs text-gray-600">
            {{ getTypeLabel(search.searchType) }}
            <span v-if="search.results_count > 0"
              >• {{ search.results_count }} results</span
            >
            • {{ formatTime(search.searched_at) }}
          </p>
        </div>
        <button
          @click.stop="$emit('save-search', search)"
          class="text-gray-400 hover:text-blue-600"
          title="Save this search"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 5a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <svg
        class="mx-auto h-8 w-8 text-gray-400 mb-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-sm text-gray-600">No search history</p>
      <p class="text-xs text-gray-500">Your recent searches will appear here</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSavedSearches } from "~/composables/useSavedSearches";
import type { SearchHistory } from "~/types/models";

const emit = defineEmits<{
  "apply-search": [search: SearchHistory];
  "save-search": [search: SearchHistory];
}>();

const { recentSearches, clearHistory } = useSavedSearches();

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    all: "All",
    schools: "Schools",
    coaches: "Coaches",
    interactions: "Interactions",
    metrics: "Metrics",
  };
  return labels[type] || type;
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

// Load search history on mount
await useSavedSearches().loadSearchHistory();
</script>
