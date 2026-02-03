<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Advanced Search</h1>
        <p class="text-gray-600 mt-1">
          Search across schools, coaches, interactions, and performance metrics
        </p>
      </div>

      <!-- Save Search Dialog -->
      <SaveSearchDialog
        :is-open="showSaveDialog"
        :search-query="searchQuery"
        :search-type="searchType"
        :filters="filters"
        :results-count="totalResults"
        @close="showSaveDialog = false"
        @saved="onSearchSaved"
      />

      <!-- Search Input -->
      <div class="mb-6">
        <div class="flex gap-2 mb-4">
          <button
            v-if="searchQuery && hasResults"
            data-testid="save-search-button"
            @click="showSaveDialog = true"
            class="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition flex items-center gap-2"
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
            Save Search
          </button>
        </div>

        <SearchInput
          v-model="searchQuery"
          :search-type="searchType"
          :is-searching="isSearching"
          @update:search-type="
            searchType = $event as
              | 'all'
              | 'schools'
              | 'coaches'
              | 'interactions'
              | 'metrics'
          "
          @search="handleSearch"
          @suggestions="handleSuggestions"
        />
      </div>

      <!-- Saved Searches & History (when not searching) -->
      <div
        v-if="!searchQuery"
        class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
      >
        <SavedSearchesList @apply-search="applySavedSearch" />
        <SearchHistoryList
          @apply-search="applyHistorySearch"
          @save-search="openSaveFromHistory"
        />
      </div>

      <!-- Search Type Tabs -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="flex gap-6 -mb-px">
          <button
            v-for="type in searchTypes"
            :key="type"
            @click="searchType = type"
            :class="[
              'pb-3 px-1 border-b-2 font-semibold transition',
              searchType === type
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900',
            ]"
          >
            {{ getTypeLabel(type) }}
          </button>
        </nav>
      </div>

      <!-- Filters -->
      <div v-if="hasResults || searchQuery" class="mb-6">
        <AdvancedFilters
          :filters="filters"
          :search-type="searchType"
          :is-filtering="isFiltering"
          @update:filters="applyFilters"
          @clear-filters="clearSearchFilters"
        />
      </div>

      <!-- Results -->
      <div v-if="searchQuery" class="space-y-8">
        <!-- Loading State -->
        <div v-if="isSearching" class="text-center py-12">
          <div class="inline-flex items-center gap-2">
            <div
              class="w-4 h-4 bg-blue-600 rounded-full animate-bounce"
              style="animation-delay: 0ms"
            ></div>
            <div
              class="w-4 h-4 bg-blue-600 rounded-full animate-bounce"
              style="animation-delay: 150ms"
            ></div>
            <div
              class="w-4 h-4 bg-blue-600 rounded-full animate-bounce"
              style="animation-delay: 300ms"
            ></div>
          </div>
          <p class="text-gray-600 mt-4">Searching...</p>
        </div>

        <!-- Error State -->
        <div
          v-else-if="searchError"
          class="bg-red-50 border border-red-200 rounded-lg p-6"
        >
          <p class="text-red-800">{{ searchError }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!hasResults" class="text-center py-12">
          <p class="text-gray-600">No results found for "{{ searchQuery }}"</p>
          <p class="text-sm text-gray-500 mt-2">
            Try adjusting your search or filters
          </p>
        </div>

        <!-- Schools Results -->
        <div
          v-if="
            (searchType === 'all' || searchType === 'schools') &&
            schoolResults.length > 0
          "
        >
          <SearchResultsSection
            title="Schools"
            :count="schoolResults.length"
            result-type="school"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SchoolCard
                v-for="school in schoolResults"
                :key="school.id"
                :school="school"
                clickable
                @click="navigateToSchool(school.id)"
              />
            </div>
          </SearchResultsSection>
        </div>

        <!-- Coaches Results -->
        <div
          v-if="
            (searchType === 'all' || searchType === 'coaches') &&
            coachResults.length > 0
          "
        >
          <SearchResultsSection
            title="Coaches"
            :count="coachResults.length"
            result-type="coach"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CoachCard
                v-for="coach in coachResults"
                :key="coach.id"
                :coach="coach"
                clickable
                @click="navigateToCoach(coach.id)"
              />
            </div>
          </SearchResultsSection>
        </div>

        <!-- Interactions Results -->
        <div
          v-if="
            (searchType === 'all' || searchType === 'interactions') &&
            interactionResults.length > 0
          "
        >
          <SearchResultsSection
            title="Interactions"
            :count="interactionResults.length"
            result-type="interaction"
          >
            <div class="space-y-3">
              <InteractionCard
                v-for="interaction in interactionResults"
                :key="interaction.id"
                :interaction="interaction"
                clickable
                @click="navigateToInteraction(interaction.id)"
              />
            </div>
          </SearchResultsSection>
        </div>

        <!-- Metrics Results -->
        <div
          v-if="
            (searchType === 'all' || searchType === 'metrics') &&
            metricsResults.length > 0
          "
        >
          <SearchResultsSection
            title="Performance Metrics"
            :count="metricsResults.length"
            result-type="metric"
          >
            <div class="space-y-2">
              <MetricRow
                v-for="metric in metricsResults"
                :key="metric.id"
                :metric="metric"
                clickable
                @click="navigateToMetrics"
              />
            </div>
          </SearchResultsSection>
        </div>
      </div>

      <!-- Empty Search State -->
      <div v-else class="text-center py-12">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">Search your data</h3>
        <p class="mt-2 text-gray-600">
          Enter a search term above to find schools, coaches, interactions, and
          metrics
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useSearchConsolidated } from "~/composables/useSearchConsolidated";
import { useSavedSearches } from "~/composables/useSavedSearches";
import type { SavedSearch, SearchHistory } from "~/types/models";

definePageMeta({ middleware: "auth" });

const router = useRouter();
const {
  query: searchQuery,
  searchType,
  isSearching,
  searchError,
  filters,
  isFiltering,
  schoolResults,
  coachResults,
  interactionResults,
  metricsResults,
  totalResults,
  hasResults,
  performSearch,
  clearFilters: clearSearchFilters,
  applyFilter: applyFilters,
  getSchoolSuggestions,
  getCoachSuggestions,
} = useSearchConsolidated();

const { recordSearch, incrementUseCount } = useSavedSearches();

const searchTypes = [
  "all",
  "schools",
  "coaches",
  "interactions",
  "metrics",
] as const;
const showSaveDialog = ref(false);

// Methods
const handleSearch = async (query: string) => {
  await performSearch(query);
  // Record search in history
  await recordSearch(
    query,
    searchType.value,
    totalResults.value,
    filters.value,
  );
};

const handleSuggestions = () => {
  // Could implement suggestion selection here
};

const handleFilterChange = async (updatedFilters: any) => {
  // Apply new filters and re-search
  if (searchQuery.value) {
    applyFilters(updatedFilters);
    await performSearch();
  }
};

const onSearchSaved = (savedSearch: SavedSearch) => {
  // Toast notification could go here
  console.log("Search saved:", savedSearch.name);
};

const applySavedSearch = async (savedSearch: SavedSearch) => {
  // Apply saved search
  searchQuery.value = savedSearch.query;
  await performSearch(savedSearch.query);
  await incrementUseCount(savedSearch.id);
};

const applyHistorySearch = async (historyItem: SearchHistory) => {
  // Apply search from history
  searchQuery.value = historyItem.query;
  await performSearch(historyItem.query);
};

const openSaveFromHistory = (historyItem: SearchHistory) => {
  // Open save dialog pre-filled with history search
  searchQuery.value = historyItem.query;
  showSaveDialog.value = true;
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    all: "All Results",
    schools: "Schools",
    coaches: "Coaches",
    interactions: "Interactions",
    metrics: "Performance Metrics",
  };
  return labels[type] || type;
};

const navigateToSchool = (id: string) => {
  router.push(`/schools/${id}`);
};

const navigateToCoach = (id: string) => {
  router.push(`/coaches/${id}`);
};

const navigateToInteraction = (id: string) => {
  router.push(`/interactions/${id}`);
};

const navigateToMetrics = () => {
  router.push("/performance");
};
</script>
