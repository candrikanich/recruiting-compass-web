<template>
  <div class="space-y-6 mb-8">
    <!-- Filter Header with Search + Sliders -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-4">
      <!-- Search (left) -->
      <div class="flex-1">
        <label
          class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3"
        >
          Find Schools
        </label>
        <div class="relative group">
          <MagnifyingGlassIcon
            class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
          />
          <input
            type="text"
            :value="String(filterValues.name ?? '')"
            @input="
              $emit(
                'update:filter',
                'name',
                ($event.target as HTMLInputElement).value,
              )
            "
            placeholder="Search by name or location..."
            class="w-full pl-12 pr-4 py-3 text-slate-700 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white hover:border-slate-300"
          />
        </div>
      </div>

      <!-- Fit Score Slider -->
      <div class="w-full lg:w-1/4">
        <div class="flex items-center justify-between mb-2">
          <label
            class="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
          >
            Fit Score
          </label>
          <span class="text-sm font-semibold text-blue-600">
            {{ filterValues.fit_score?.min ?? 0 }}–{{
              filterValues.fit_score?.max ?? 100
            }}
          </span>
        </div>
        <div class="flex gap-2">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            :value="filterValues.fit_score?.min ?? 0"
            @input="
              $emit('update:filter', 'fit_score', {
                min: parseInt(($event.target as HTMLInputElement).value),
                max: filterValues.fit_score?.max ?? 100,
              })
            "
            class="flex-1 h-2.5 bg-gradient-to-r from-slate-300 to-slate-400 rounded-full appearance-none cursor-pointer accent-blue-500 transition-opacity"
          />
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            :value="filterValues.fit_score?.max ?? 100"
            @input="
              $emit('update:filter', 'fit_score', {
                min: filterValues.fit_score?.min ?? 0,
                max: parseInt(($event.target as HTMLInputElement).value),
              })
            "
            class="flex-1 h-2.5 bg-gradient-to-r from-slate-300 to-slate-400 rounded-full appearance-none cursor-pointer accent-blue-500 transition-opacity"
          />
        </div>
      </div>

      <!-- Distance Slider -->
      <div class="w-full lg:w-1/4">
        <div class="flex items-center justify-between mb-2">
          <label
            class="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
          >
            Distance
          </label>
          <span class="text-sm font-semibold text-blue-600">
            {{ filterValues.distance?.max ?? 3000 }}
            <span class="text-xs text-slate-500">mi</span>
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="3000"
          step="50"
          :value="filterValues.distance?.max ?? 3000"
          @input="
            $emit('update:filter', 'distance', {
              max: parseInt(($event.target as HTMLInputElement).value),
            })
          "
          :disabled="!userHomeLocation"
          class="w-full h-2.5 bg-gradient-to-r from-slate-300 to-slate-400 rounded-full appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        />
        <p
          v-if="!userHomeLocation"
          class="text-xs text-amber-700 mt-1 px-2 py-0.5 bg-amber-50 rounded border border-amber-200"
        >
          Set home location
        </p>
      </div>
    </div>

    <!-- Filter Sections Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <div
        class="lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4"
      >
        <!-- Division -->
        <FilterSelect
          label="Division"
          :value="String(filterValues.division ?? '')"
          @change="$emit('update:filter', 'division', $event || null)"
        >
          <option value="">All</option>
          <option value="D1">D1</option>
          <option value="D2">D2</option>
          <option value="D3">D3</option>
          <option value="NAIA">NAIA</option>
          <option value="JUCO">JUCO</option>
        </FilterSelect>

        <!-- Status -->
        <FilterSelect
          label="Status"
          :value="String(filterValues.status ?? '')"
          @change="$emit('update:filter', 'status', $event || null)"
        >
          <option value="">All</option>
          <option value="researching">Researching</option>
          <option value="contacted">Contacted</option>
          <option value="interested">Interested</option>
          <option value="offer_received">Offer</option>
          <option value="committed">Committed</option>
        </FilterSelect>

        <!-- State -->
        <FilterSelect
          label="State"
          :value="String(filterValues.state ?? '')"
          @change="$emit('update:filter', 'state', $event || null)"
        >
          <option value="">All</option>
          <option
            v-for="option in stateOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </FilterSelect>

        <!-- Favorites -->
        <FilterSelect
          label="Favorites"
          :value="filterValues.is_favorite ? 'true' : ''"
          @change="
            $emit('update:filter', 'is_favorite', $event === 'true' || null)
          "
        >
          <option value="">All</option>
          <option value="true">Starred</option>
        </FilterSelect>

        <!-- Priority Tier -->
        <FilterSelect
          label="Tier"
          :value="
            priorityTierFilter && priorityTierFilter.length === 1
              ? priorityTierFilter[0]
              : ''
          "
          @change="
            $emit(
              'update:priority-tier',
              $event ? [$event as 'A' | 'B' | 'C'] : null,
            )
          "
        >
          <option value="">All</option>
          <option value="A">A - Top Choice</option>
          <option value="B">B - Strong Interest</option>
          <option value="C">C - Fallback</option>
        </FilterSelect>

        <!-- Sort -->
        <FilterSelect
          label="Sort"
          :value="sortBy"
          @change="$emit('update:sort', $event)"
        >
          <option value="a-z">A-Z</option>
          <option value="fit-score">Fit Score</option>
          <option value="distance">Distance</option>
          <option value="last-contact">Last Contact</option>
        </FilterSelect>
      </div>
    </div>

    <!-- Active Filters Chips -->
    <div
      v-if="hasActiveFilters"
      class="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100"
    >
      <span
        class="text-xs font-semibold text-slate-500 uppercase tracking-wide"
      >
        Filters:
      </span>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="(value, key) in activeFiltersDisplay"
          :key="key"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200 hover:bg-blue-100 transition-colors group"
        >
          <span class="text-blue-500">&#x25CF;</span>
          {{ value }}
          <button
            @click="$emit('remove-filter', key as string)"
            class="ml-1 text-blue-400 hover:text-blue-600 transition-colors group-hover:opacity-100"
          >
            <XMarkIcon class="w-3.5 h-3.5" />
          </button>
        </span>
      </div>
      <button
        @click="$emit('clear-filters')"
        class="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
      >
        Clear all
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import FilterSelect from "~/components/School/FilterSelect.vue";

interface SchoolFilterValues {
  name?: string;
  division?: string;
  status?: string;
  state?: string;
  is_favorite?: boolean;
  fit_score?: { min: number; max: number };
  distance?: { max: number };
}

defineProps<{
  filterValues: SchoolFilterValues;
  hasActiveFilters: boolean;
  activeFiltersDisplay: Record<string, string>;
  stateOptions: { value: string; label: string }[];
  userHomeLocation: { latitude: number; longitude: number } | null;
  sortBy: string;
  priorityTierFilter: ("A" | "B" | "C")[] | null;
}>();

defineEmits<{
  "update:filter": [field: string, value: any];
  "remove-filter": [field: string];
  "clear-filters": [];
  "update:sort": [value: string];
  "update:priority-tier": [tiers: ("A" | "B" | "C")[] | null];
}>();
</script>

<style scoped>
/* Range input slider styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 10px;
  background: transparent;
  cursor: pointer;
  outline: none;
}

input[type="range"]::-webkit-slider-runnable-track {
  height: 6px;
  background: linear-gradient(to right, #cbd5e1, #a1a5ab);
  border-radius: 3px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  margin-top: -5px;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: #2563eb;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-track {
  background: linear-gradient(to right, #cbd5e1, #a1a5ab);
  height: 6px;
  border-radius: 3px;
  border: none;
}

input[type="range"]::-moz-range-progress {
  background: linear-gradient(to right, #cbd5e1, #a1a5ab);
  height: 6px;
  border-radius: 3px;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb:hover {
  background: #2563eb;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

input[type="range"]:disabled::-webkit-slider-runnable-track {
  background: #e2e8f0;
}

input[type="range"]:disabled::-webkit-slider-thumb {
  background: #cbd5e1;
  cursor: not-allowed;
}

input[type="range"]:disabled::-moz-range-track {
  background: #e2e8f0;
}

input[type="range"]:disabled::-moz-range-thumb {
  background: #cbd5e1;
  cursor: not-allowed;
}
</style>
