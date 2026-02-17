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
          class="text-sm font-medium text-gray-700 mb-2"
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
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
          class="space-y-2 p-3 border border-gray-300 rounded-lg bg-white max-h-32 overflow-y-auto"
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
              class="w-4 h-4 text-blue-600 rounded"
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
          class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
            class="px-3 py-2 border border-gray-300 rounded-lg flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            class="px-3 py-2 border border-gray-300 rounded-lg flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              class="px-3 py-2 border border-gray-300 rounded-lg flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              class="px-3 py-2 border border-gray-300 rounded-lg flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Preset buttons -->
          <div v-if="config.presets" class="flex flex-wrap gap-2">
            <button
              v-for="preset in config.presets"
              :key="preset.label"
              @click="applyDatePreset(config.field, preset)"
              class="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <!-- Help text -->
        <p v-if="config.helpText" class="text-xs text-gray-500 mt-1">
          {{ config.helpText }}
        </p>
      </div>
    </div>

    <!-- Filter actions -->
    <div
      class="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-gray-200"
    >
      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Clear Filters
      </button>

      <!-- Preset dropdown -->
      <div v-if="presets.length > 0" class="relative">
        <button
          @click="showPresetMenu = !showPresetMenu"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <span>Load Preset</span>
          <svg
            class="w-4 h-4"
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
          class="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10"
          @click.outside="showPresetMenu = false"
        >
          <button
            v-for="preset in presets"
            :key="preset.id"
            @click="loadPreset(preset.id)"
            class="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors first:rounded-t-lg last:rounded-b-lg border-b last:border-b-0"
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
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <svg
          class="w-4 h-4"
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
      <div class="text-sm text-gray-600 py-2">
        {{ filteredCount }} result<span v-if="filteredCount !== 1">s</span>
      </div>
    </div>

    <!-- Save preset dialog -->
    <div
      v-if="showSavePresetDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showSavePresetDialog = false"
    >
      <div
        class="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl"
        @click.stop
      >
        <h3 class="text-lg font-semibold mb-4">Save Filter Preset</h3>

        <input
          v-model="newPresetName"
          type="text"
          placeholder="Preset name (e.g., 'My Favorites')"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          @keyup.enter="doSavePreset"
        />

        <textarea
          v-model="newPresetDescription"
          placeholder="Optional description"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-sm h-20 resize-none"
        />

        <div class="flex gap-2 justify-end">
          <button
            @click="showSavePresetDialog = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="doSavePreset"
            :disabled="!newPresetName.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
const filterGridClasses = computed(() =>
  `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${props.columns} gap-4`
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
