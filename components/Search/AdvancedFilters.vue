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
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        Filters
      </h3>

      <button
        v-if="isFiltering"
        @click="clearAllFilters"
        class="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Clear All
      </button>
    </div>

    <!-- Schools Filters -->
    <div
      v-if="searchType === 'all' || searchType === 'schools'"
      class="space-y-4"
    >
      <h4 class="font-semibold text-gray-900 text-sm">School Filters</h4>

      <!-- Division -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >Division</label
        >
        <select
          :value="filters.schools.division"
          @change="updateFilter('schools', 'division', getSelectValue($event))"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Divisions</option>
          <option value="D1">Division 1</option>
          <option value="D2">Division 2</option>
          <option value="D3">Division 3</option>
          <option value="NAIA">NAIA</option>
          <option value="JUCO">JUCO</option>
        </select>
      </div>

      <!-- State -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >State</label
        >
        <input
          :value="filters.schools.state"
          @input="updateFilter('schools', 'state', getInputValue($event))"
          type="text"
          placeholder="e.g., CA, TX, NY"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Verified Only -->
      <div class="flex items-center">
        <input
          :checked="filters.schools.verified"
          @change="updateFilter('schools', 'verified', getInputChecked($event))"
          type="checkbox"
          id="schools-verified"
          class="h-4 w-4 text-blue-600 rounded"
        />
        <label
          for="schools-verified"
          class="ml-2 text-sm font-medium text-gray-700"
        >
          Verified Schools Only
        </label>
      </div>

      <Divider />
    </div>

    <!-- Coaches Filters -->
    <div
      v-if="searchType === 'all' || searchType === 'coaches'"
      class="space-y-4"
    >
      <h4 class="font-semibold text-gray-900 text-sm">Coach Filters</h4>

      <!-- Sport -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >Sport</label
        >
        <select
          :value="filters.coaches.sport"
          @change="updateFilter('coaches', 'sport', getSelectValue($event))"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sports</option>
          <option value="baseball">Baseball</option>
          <option value="softball">Softball</option>
          <option value="other">Other</option>
        </select>
      </div>

      <!-- Response Rate -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Minimum Response Rate: {{ filters.coaches.responseRate }}%
        </label>
        <input
          :value="filters.coaches.responseRate"
          @input="
            updateFilter('coaches', 'responseRate', getInputNumber($event))
          "
          type="range"
          min="0"
          max="100"
          step="10"
          class="w-full"
        />
      </div>

      <!-- Verified Only -->
      <div class="flex items-center">
        <input
          :checked="filters.coaches.verified"
          @change="updateFilter('coaches', 'verified', getInputChecked($event))"
          type="checkbox"
          id="coaches-verified"
          class="h-4 w-4 text-blue-600 rounded"
        />
        <label
          for="coaches-verified"
          class="ml-2 text-sm font-medium text-gray-700"
        >
          Verified Coaches Only
        </label>
      </div>

      <Divider />
    </div>

    <!-- Interaction Filters -->
    <div
      v-if="searchType === 'all' || searchType === 'interactions'"
      class="space-y-4"
    >
      <h4 class="font-semibold text-gray-900 text-sm">Interaction Filters</h4>

      <!-- Sentiment -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >Sentiment</label
        >
        <select
          :value="filters.interactions.sentiment"
          @change="
            updateFilter('interactions', 'sentiment', getSelectValue($event))
          "
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>

      <!-- Direction -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >Direction</label
        >
        <select
          :value="filters.interactions.direction"
          @change="
            updateFilter('interactions', 'direction', getSelectValue($event))
          "
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>
      </div>

      <!-- Date Range -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >From</label
          >
          <input
            :value="filters.interactions.dateFrom"
            @input="
              updateFilter('interactions', 'dateFrom', getInputValue($event))
            "
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input
            :value="filters.interactions.dateTo"
            @input="
              updateFilter('interactions', 'dateTo', getInputValue($event))
            "
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <Divider />
    </div>

    <!-- Metrics Filters -->
    <div
      v-if="searchType === 'all' || searchType === 'metrics'"
      class="space-y-4"
    >
      <h4 class="font-semibold text-gray-900 text-sm">Metric Filters</h4>

      <!-- Metric Type -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >Metric Type</label
        >
        <select
          :value="filters.metrics.metricType"
          @change="
            updateFilter('metrics', 'metricType', getSelectValue($event))
          "
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Metrics</option>
          <option value="velocity">Velocity</option>
          <option value="exit_velo">Exit Velocity</option>
          <option value="sixty_time">60-Yard Dash</option>
          <option value="pop_time">Pop Time</option>
          <option value="batting_avg">Batting Average</option>
          <option value="era">ERA</option>
          <option value="strikeouts">Strikeouts</option>
        </select>
      </div>

      <!-- Value Range -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Min Value</label
          >
          <input
            :value="filters.metrics.minValue"
            @input="updateFilter('metrics', 'minValue', getInputNumber($event))"
            type="number"
            step="0.1"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Max Value</label
          >
          <input
            :value="filters.metrics.maxValue"
            @input="updateFilter('metrics', 'maxValue', getInputNumber($event))"
            type="number"
            step="0.1"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  filters: any;
  searchType: string;
  isFiltering: boolean;
}

const emit = defineEmits<{
  "update:filters": [filters: any];
  "clear-filters": [];
}>();

defineProps<Props>();

const updateFilter = (category: string, filterName: string, value: any) => {
  emit("update:filters", { category, filterName, value });
};

const clearAllFilters = () => {
  emit("clear-filters");
};

// Helper methods for type-safe event handling
const getSelectValue = (event: Event): string => {
  return (event.target as HTMLSelectElement).value;
};

const getInputValue = (event: Event): string => {
  return (event.target as HTMLInputElement).value;
};

const getInputChecked = (event: Event): boolean => {
  return (event.target as HTMLInputElement).checked;
};

const getInputNumber = (event: Event): number => {
  return parseFloat((event.target as HTMLInputElement).value);
};
</script>
