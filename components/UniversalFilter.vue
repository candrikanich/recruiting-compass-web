<template>
  <div class="universal-filter">
    <!-- Filter controls -->
    <div :class="filterGridClasses">
      <!-- Dynamic filter inputs -->
      <div
        v-for="config in visibleConfigs"
        :key="config.field"
        class="flex flex-col"
      >
        <label
          :for="`filter-${config.field}`"
          class="mb-2 text-sm font-medium text-gray-700"
        >
          {{ config.label }}
        </label>

        <!-- Text filter -->
        <input
          v-if="config.type === 'text'"
          :id="`filter-${config.field}`"
          type="text"
          :placeholder="config.placeholder || 'Search...'"
          :value="filterValues[config.field] || ''"
          @input="
            setFilterValue(
              config.field,
              ($event.target as HTMLInputElement).value,
            )
          "
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        />

        <!-- Select filter -->
        <select
          v-else-if="config.type === 'select'"
          :id="`filter-${config.field}`"
          :value="filterValues[config.field] ?? ''"
          @change="
            setFilterValue(
              config.field,
              ($event.target as HTMLSelectElement).value || null,
            )
          "
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- All --</option>
          <option
            v-for="option in config.options"
            :key="String(option.value)"
            :value="String(option.value)"
          >
            {{ option.label }}
          </option>
        </select>

        <!-- Multiselect filter -->
        <div
          v-else-if="config.type === 'multiselect'"
          class="max-h-32 space-y-2 overflow-y-auto rounded-lg border border-gray-300 bg-white p-3"
        >
          <label
            v-for="option in config.options"
            :key="String(option.value)"
            class="flex items-center"
          >
            <input
              type="checkbox"
              :checked="isMultiSelectChecked(config.field, option.value)"
              @change="toggleMultiSelectValue(config.field, option.value)"
              class="h-4 w-4 rounded-sm text-blue-600"
            />
            <span class="ml-2 text-sm">{{ option.label }}</span>
          </label>
        </div>

        <!-- Boolean filter -->
        <select
          v-else-if="config.type === 'boolean'"
          :id="`filter-${config.field}`"
          :value="filterValues[config.field] ?? ''"
          @change="
            setFilterValue(
              config.field,
              ($event.target as HTMLSelectElement).value === 'true'
                ? true
                : ($event.target as HTMLSelectElement).value === 'false'
                  ? false
                  : null,
            )
          "
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- All --</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>

        <!-- Range filter -->
        <div v-else-if="config.type === 'range'" class="flex gap-2">
          <input
            type="number"
            :min="config.min"
            :max="config.max"
            :step="config.step"
            :placeholder="`Min (${config.min})`"
            :value="getRangeValue(config.field)?.[0] ?? config.min ?? ''"
            @input="
              setRangeValue(
                config.field,
                0,
                ($event.target as HTMLInputElement).value,
              )
            "
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            :min="config.min"
            :max="config.max"
            :step="config.step"
            :placeholder="`Max (${config.max})`"
            :value="getRangeValue(config.field)?.[1] ?? config.max ?? ''"
            @input="
              setRangeValue(
                config.field,
                1,
                ($event.target as HTMLInputElement).value,
              )
            "
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Date range filter -->
        <div v-else-if="config.type === 'daterange'" class="space-y-2">
          <div class="flex gap-2">
            <input
              type="date"
              :value="getDateRangeValue(config.field)?.[0] ?? ''"
              @change="
                setDateRangeValue(
                  config.field,
                  0,
                  ($event.target as HTMLInputElement).value,
                )
              "
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              :value="getDateRangeValue(config.field)?.[1] ?? ''"
              @change="
                setDateRangeValue(
                  config.field,
                  1,
                  ($event.target as HTMLInputElement).value,
                )
              "
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Preset buttons -->
          <div v-if="config.presets" class="flex flex-wrap gap-2">
            <button
              v-for="preset in config.presets"
              :key="preset.label"
              @click="applyDatePreset(config.field, preset)"
              class="rounded-sm bg-gray-200 px-2 py-1 text-xs transition-colors hover:bg-gray-300"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <!-- Help text -->
        <p v-if="config.helpText" class="mt-1 text-xs text-gray-500">
          {{ config.helpText }}
        </p>
      </div>
    </div>

    <!-- Filter actions -->
    <div
      class="mt-6 flex flex-col gap-2 border-t border-gray-200 pt-4 sm:flex-row"
    >
      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        Clear Filters
      </button>

      <!-- Preset dropdown -->
      <div v-if="presets.length > 0" class="relative">
        <button
          @click="showPresetMenu = !showPresetMenu"
          class="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <span>Load Preset</span>
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>

        <!-- Preset menu -->
        <div
          v-if="showPresetMenu"
          class="absolute top-full left-0 z-10 mt-1 w-48 rounded-lg border border-gray-300 bg-white shadow-lg"
          @click.outside="showPresetMenu = false"
        >
          <button
            v-for="preset in presets"
            :key="preset.id"
            @click="loadPreset(preset.id)"
            class="w-full border-b px-4 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg last:border-b-0 hover:bg-blue-50"
          >
            <div class="font-medium">{{ preset.name }}</div>
            <div v-if="preset.description" class="text-xs text-gray-500">
              {{ preset.description }}
            </div>
          </button>
        </div>
      </div>

      <!-- Save preset button -->
      <button
        v-if="hasActiveFilters"
        @click="showSavePresetDialog = true"
        class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Save as Preset
      </button>

      <div class="flex-1" />

      <!-- Result count -->
      <div class="py-2 text-sm text-gray-600">
        {{ filteredCount }} result<span v-if="filteredCount !== 1">s</span>
      </div>
    </div>

    <!-- Save preset dialog -->
    <div
      v-if="showSavePresetDialog"
      class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
      @click="showSavePresetDialog = false"
    >
      <div
        class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
        @click.stop
      >
        <h3 class="mb-4 text-lg font-semibold">Save Filter Preset</h3>

        <input
          v-model="newPresetName"
          type="text"
          placeholder="Preset name (e.g., 'My Favorites')"
          class="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
          @keyup.enter="doSavePreset"
        />

        <textarea
          v-model="newPresetDescription"
          placeholder="Optional description"
          class="mb-4 h-20 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        />

        <div class="flex justify-end gap-2">
          <button
            @click="showSavePresetDialog = false"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="doSavePreset"
            :disabled="!newPresetName.trim()"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Preset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type {
  FilterConfig,
  FilterPreset,
  DateRangePreset,
} from "~/types/filters";

interface Props {
  configs: FilterConfig[];
  filterValues: Record<string, any>;
  presets: FilterPreset[];
  filteredCount: number;
  hasActiveFilters: boolean;
  columns?: number;
}

interface Emits {
  (e: "update:filter", field: string, value: any): void;
  (e: "clear-filters"): void;
  (e: "save-preset", name: string, description?: string): void;
  (e: "load-preset", presetId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  columns: 3,
});
const emit = defineEmits<Emits>();

// UI state
const showPresetMenu = ref(false);
const showSavePresetDialog = ref(false);
const newPresetName = ref("");
const newPresetDescription = ref("");

// Visible configs (filter by visible: true, default is true)
const visibleConfigs = computed(() => {
  return props.configs.filter((c) => c.visible !== false);
});

// Dynamic grid classes based on columns prop
const filterGridClasses = computed(
  () => `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${props.columns} gap-4`,
);

// Handle single value changes
const setFilterValue = (field: string, value: any) => {
  emit("update:filter", field, value === "" ? null : value);
};

// Handle multiselect checkbox toggle
const toggleMultiSelectValue = (field: string, optionValue: any) => {
  const current = props.filterValues[field] || [];
  const updated = Array.isArray(current) ? [...current] : [];

  const index = updated.findIndex((v) => v === optionValue);
  if (index >= 0) {
    updated.splice(index, 1);
  } else {
    updated.push(optionValue);
  }

  emit("update:filter", field, updated.length > 0 ? updated : null);
};

const isMultiSelectChecked = (field: string, optionValue: any): boolean => {
  const current = props.filterValues[field];
  return Array.isArray(current) && current.includes(optionValue);
};

// Handle range value changes
const getRangeValue = (field: string): [number, number] | null => {
  const value = props.filterValues[field];
  return Array.isArray(value) && value.length === 2
    ? (value as [number, number])
    : null;
};

const setRangeValue = (field: string, index: 0 | 1, value: string) => {
  const config = props.configs.find((c) => c.field === field);
  const min = config?.min ?? 0;
  const max = config?.max ?? 100;
  const current = getRangeValue(field) || [min, max];
  const numValue = parseFloat(value) || (index === 0 ? min : max);

  const updated: [number, number] = [...current] as [number, number];
  updated[index] = numValue;

  emit("update:filter", field, updated);
};

// Handle date range changes
const getDateRangeValue = (field: string): [string, string] | null => {
  const value = props.filterValues[field];
  if (Array.isArray(value) && value.length === 2) {
    return [formatDateToInput(value[0]), formatDateToInput(value[1])];
  }
  return null;
};

const setDateRangeValue = (field: string, index: 0 | 1, value: string) => {
  if (!value) return;

  const current = props.filterValues[field];
  const [start, end] = Array.isArray(current)
    ? [new Date(current[0]), new Date(current[1])]
    : [new Date(), new Date()];

  if (index === 0) {
    start.setTime(new Date(value).getTime());
  } else {
    end.setTime(new Date(value).getTime());
  }

  emit("update:filter", field, [start, end]);
};

const applyDatePreset = (field: string, preset: DateRangePreset) => {
  const [start, end] = preset.getValue();
  emit("update:filter", field, [start, end]);
};

// Clear all filters
const clearFilters = () => {
  emit("clear-filters");
  showPresetMenu.value = false;
};

// Load preset
const loadPreset = (presetId: string) => {
  emit("load-preset", presetId);
  showPresetMenu.value = false;
};

// Save preset
const doSavePreset = () => {
  if (!newPresetName.value.trim()) return;

  emit(
    "save-preset",
    newPresetName.value,
    newPresetDescription.value || undefined,
  );

  newPresetName.value = "";
  newPresetDescription.value = "";
  showSavePresetDialog.value = false;
};

// Helper: Format Date to input[type=date] format (YYYY-MM-DD)
function formatDateToInput(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
</script>
