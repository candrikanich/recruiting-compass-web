<template>
  <div class="mb-8 space-y-6">
    <!-- Filter Header with Search + Sliders -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
      <!-- Search (left) -->
      <div class="flex-1">
        <label
          for="school-search"
          class="mb-3 block text-xs font-semibold tracking-wide text-slate-500 uppercase"
        >
          Find Schools
        </label>
        <div class="group relative">
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500"
            aria-hidden="true"
          />
          <input
            id="school-search"
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
            class="w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 pl-12 text-slate-700 placeholder-slate-400 transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <!-- Distance Slider -->
      <div class="w-full lg:w-1/4">
        <div class="mb-2 flex items-center justify-between">
          <label
            class="block text-xs font-semibold tracking-wide text-slate-500 uppercase"
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
          aria-label="Maximum distance in miles"
          :aria-valuenow="filterValues.distance?.max ?? 3000"
          aria-valuemin="0"
          aria-valuemax="3000"
          @input="
            $emit('update:filter', 'distance', {
              max: parseInt(($event.target as HTMLInputElement).value),
            })
          "
          :disabled="
            !userHomeLocation?.latitude || !userHomeLocation?.longitude
          "
          class="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-linear-to-r from-slate-300 to-slate-400 accent-blue-500 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p
          v-if="!userHomeLocation?.latitude || !userHomeLocation?.longitude"
          class="mt-1 rounded-sm border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
        >
          Set home location
        </p>
      </div>
    </div>

    <!-- Filter Sections Grid -->
    <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
      <div
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6 lg:col-span-4"
      >
        <!-- Division -->
        <SchoolFilterSelect
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
        </SchoolFilterSelect>

        <!-- Status -->
        <SchoolFilterSelect
          label="Status"
          :value="String(filterValues.status ?? '')"
          @change="$emit('update:filter', 'status', $event || null)"
        >
          <option value="">All</option>
          <option
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </SchoolFilterSelect>

        <!-- State -->
        <SchoolFilterSelect
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
        </SchoolFilterSelect>

        <!-- Favorites -->
        <SchoolFilterSelect
          label="Favorites"
          :value="filterValues.is_favorite ? 'true' : ''"
          @change="
            $emit('update:filter', 'is_favorite', $event === 'true' || null)
          "
        >
          <option value="">All</option>
          <option value="true">Starred</option>
        </SchoolFilterSelect>

        <!-- Sort -->
        <SchoolFilterSelect
          label="Sort"
          :value="sortBy"
          @change="$emit('update:sort', $event)"
        >
          <option value="a-z">A-Z</option>
          <option value="distance">Distance</option>
          <option value="last-contact">Last Contact</option>
        </SchoolFilterSelect>
      </div>
    </div>

    <!-- Active Filters Chips -->
    <div
      v-if="hasActiveFilters"
      class="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"
    >
      <span
        class="text-xs font-semibold tracking-wide text-slate-500 uppercase"
      >
        Filters:
      </span>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="(value, key) in activeFiltersDisplay"
          :key="key"
          class="group inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          <span class="text-blue-500">&#x25CF;</span>
          {{ value }}
          <button
            @click="$emit('remove-filter', key as string)"
            :aria-label="`Remove ${value} filter`"
            class="ml-1 text-blue-400 transition-colors group-hover:opacity-100 hover:text-blue-600"
          >
            <UIcon
              name="i-heroicons-x-mark"
              class="h-3.5 w-3.5"
              aria-hidden="true"
            />
          </button>
        </span>
      </div>
      <button
        @click="$emit('clear-filters')"
        aria-label="Clear all filters"
        class="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        Clear all
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HomeLocation } from "~/types/models";
import { SCHOOL_STATUS_OPTIONS } from "~/utils/schoolStatusOptions";

// Status filter choices derived from the canonical funnel (single source of truth).
const statusOptions = SCHOOL_STATUS_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

interface SchoolFilterValues {
  name?: string;
  division?: string;
  status?: string;
  state?: string;
  is_favorite?: boolean;
  distance?: { max: number };
}

defineProps<{
  filterValues: SchoolFilterValues;
  hasActiveFilters: boolean;
  activeFiltersDisplay: Record<string, string>;
  stateOptions: { value: string; label: string }[];
  userHomeLocation: HomeLocation | null;
  sortBy: string;
}>();

defineEmits<{
  "update:filter": [field: string, value: any];
  "remove-filter": [field: string];
  "clear-filters": [];
  "update:sort": [value: string];
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
  background: linear-gradient(
    to right,
    var(--color-brand-slate-300),
    var(--color-brand-slate-400)
  );
  border-radius: 3px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-brand-blue-500);
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15); /* audit-ignore — range thumb shadow, no token equivalent */
  cursor: pointer;
  margin-top: -5px;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: var(--color-brand-blue-600);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2); /* audit-ignore — range thumb shadow, no token equivalent */
}

input[type="range"]::-moz-range-track {
  background: linear-gradient(
    to right,
    var(--color-brand-slate-300),
    var(--color-brand-slate-400)
  );
  height: 6px;
  border-radius: 3px;
  border: none;
}

input[type="range"]::-moz-range-progress {
  background: linear-gradient(
    to right,
    var(--color-brand-slate-300),
    var(--color-brand-slate-400)
  );
  height: 6px;
  border-radius: 3px;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-brand-blue-500);
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15); /* audit-ignore — range thumb shadow, no token equivalent */
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb:hover {
  background: var(--color-brand-blue-600);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2); /* audit-ignore — range thumb shadow, no token equivalent */
}

input[type="range"]:disabled::-webkit-slider-runnable-track {
  background: var(--color-brand-slate-200);
}

input[type="range"]:disabled::-webkit-slider-thumb {
  background: var(--color-brand-slate-300);
  cursor: not-allowed;
}

input[type="range"]:disabled::-moz-range-track {
  background: var(--color-brand-slate-200);
}

input[type="range"]:disabled::-moz-range-thumb {
  background: var(--color-brand-slate-300);
  cursor: not-allowed;
}
</style>
