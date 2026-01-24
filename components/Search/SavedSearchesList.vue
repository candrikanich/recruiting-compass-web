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
            d="M5 5a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"
          />
        </svg>
        Saved Searches
      </h3>
      <span v-if="favoritedSearches.length > 0" class="text-sm text-gray-600"
        >{{ favoritedSearches.length }} favorite{{
          favoritedSearches.length !== 1 ? "s" : ""
        }}</span
      >
    </div>

    <!-- Favorited Searches -->
    <div v-if="favoritedSearches.length > 0" class="space-y-2 mb-6">
      <div
        v-for="search in favoritedSearches.slice(0, 5)"
        :key="search.id"
        class="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 cursor-pointer transition"
        @click="$emit('apply-search', search)"
      >
        <svg
          class="h-4 w-4 text-yellow-600 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            {{ search.name }}
          </p>
          <p class="text-xs text-gray-600">
            {{ search.query }} • Used {{ search.use_count }} times
          </p>
        </div>
        <button
          @click.stop="toggleFavorite(search.id)"
          class="text-yellow-600 hover:text-yellow-700"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        </button>
        <button
          @click.stop="deleteSavedSearch(search.id)"
          class="text-gray-400 hover:text-red-600"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Other Saved Searches -->
    <div v-if="otherSearches.length > 0" class="space-y-2">
      <p
        v-if="favoritedSearches.length > 0"
        class="text-xs font-semibold text-gray-500 uppercase"
      >
        Other Searches
      </p>
      <div
        v-for="search in otherSearches.slice(0, 5)"
        :key="search.id"
        class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition"
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            {{ search.name }}
          </p>
          <p class="text-xs text-gray-600">
            {{ search.query }} • Used {{ search.use_count }} times
          </p>
        </div>
        <button
          @click.stop="toggleFavorite(search.id)"
          class="text-gray-400 hover:text-yellow-600"
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
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        </button>
        <button
          @click.stop="deleteSavedSearch(search.id)"
          class="text-gray-400 hover:text-red-600"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="savedSearches.length === 0" class="text-center py-8">
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
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-sm text-gray-600">No saved searches yet</p>
      <p class="text-xs text-gray-500">
        Save frequently used searches for quick access
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSavedSearches } from "~/composables/useSavedSearches";
import type { SavedSearch } from "~/types/models";

const emit = defineEmits<{
  "apply-search": [search: SavedSearch];
}>();

const { savedSearches, favoritedSearches, toggleFavorite, deleteSavedSearch } =
  useSavedSearches();

const otherSearches = computed(() => {
  return savedSearches.value.filter((s) => !s.is_favorite);
});

// Load saved searches on mount
await useSavedSearches().loadSavedSearches();
</script>
