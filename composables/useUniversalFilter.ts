/**
 * Universal Filter Composable
 * Provides DRY filter state management for all list pages
 * Supports: text, select, multiselect, daterange, boolean, range filters
 */

import { ref, computed, isRef, type Ref, type ComputedRef } from "vue";
import type {
  FilterConfig,
  FilterValue,
  FilterValues,
  FilterPreset,
  UseUniversalFilterOptions,
} from "~/types/filters";

/**
 * Composable for managing universal filters across list pages
 * @param items - The array of items to filter
 * @param configs - Array of filter configurations
 * @param options - Optional configuration
 * @returns Filter state and computed filtered items
 */
export const useUniversalFilter = <T extends Record<string, unknown>>(
  items: Ref<T[]> | T[],
  configs: FilterConfig[] | Ref<FilterConfig[]> | ComputedRef<FilterConfig[]>,
  options: UseUniversalFilterOptions = {},
): {
  filterValues: Ref<FilterValues>;
  filterValuesRaw: Readonly<Ref<FilterValues>>;
  presets: Readonly<Ref<FilterPreset[]>>;
  activePresetId: Readonly<Ref<string | undefined>>;
  filteredItems: ComputedRef<T[]>;
  activeFilterCount: ComputedRef<number>;
  hasActiveFilters: ComputedRef<boolean>;
  setFilterValue: (field: string, value: FilterValue) => void;
  clearFilters: () => void;
  savePreset: (name: string, description?: string) => FilterPreset;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  updatePreset: (presetId: string, updates: Partial<FilterPreset>) => void;
  getConfigForField: (field: string) => FilterConfig | undefined;
  getFilterDisplayValue: (field: string) => string;
  configs: Ref<FilterConfig[]>;
} => {
  // Options with defaults
  const {
    storageKey = "filter-state",
    persistState = true,
    debounceMs = 0,
    compareValues = (a, b) => a === b,
  } = options;

  // Convert items to ref if it's not already
  const itemsRef = isRef(items) ? items : ref(items);

  // Convert configs to ref if it's not already
  const configsRef = isRef(configs) ? configs : ref(configs);

  // Filter state
  const filterValues = ref<FilterValues>({});
  const presets = ref<FilterPreset[]>([]);
  const activePresetId = ref<string>();

  // Initialize filter values from config defaults
  const initializeFilters = () => {
    const initial: FilterValues = {};
    configsRef.value.forEach((config) => {
      initial[config.field] = config.defaultValue ?? null;
    });
    filterValues.value = initial;
  };

  // Load filters from localStorage if enabled
  const loadFromStorage = () => {
    if (!persistState) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { values, presets: storedPresets } = JSON.parse(stored);
        if (values) filterValues.value = values;
        if (storedPresets) presets.value = storedPresets;
      }
    } catch (error) {
      console.warn("Failed to load filters from storage:", error);
    }
  };

  // Save filters to localStorage if enabled
  const saveToStorage = () => {
    if (!persistState) return;

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          values: filterValues.value,
          presets: presets.value,
        }),
      );
    } catch (error) {
      console.warn("Failed to save filters to storage:", error);
    }
  };

  // Debounced filter value updates
  const debounceTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

  // Set individual filter value with debounce support
  const setFilterValue = (field: string, value: FilterValue) => {
    if (debounceMs > 0) {
      // Clear existing timeout for this field
      if (debounceTimeouts[field]) {
        clearTimeout(debounceTimeouts[field]);
      }

      // Set new debounced timeout
      debounceTimeouts[field] = setTimeout(() => {
        filterValues.value[field] = value;
        activePresetId.value = undefined;
        saveToStorage();
        delete debounceTimeouts[field];
      }, debounceMs);
    } else {
      // No debounce - update immediately
      filterValues.value[field] = value;
      activePresetId.value = undefined;
      saveToStorage();
    }
  };

  // Reset all filters to defaults
  const clearFilters = () => {
    const initial: FilterValues = {};
    configsRef.value.forEach((config) => {
      initial[config.field] = config.defaultValue ?? null;
    });
    filterValues.value = initial;
    activePresetId.value = undefined;
    saveToStorage();
  };

  // Get active filter count (non-null, non-empty filters)
  const activeFilterCount = computed(() => {
    return Object.values(filterValues.value).filter((v) => {
      if (v === null || v === undefined) return false;
      if (typeof v === "string" && v === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }).length;
  });

  // Check if item passes all active filters
  const passesFilters = (item: T): boolean => {
    return configsRef.value.every((config) => {
      const filterValue = filterValues.value[config.field];

      // Skip if filter is not active
      if (filterValue === null || filterValue === undefined) return true;
      if (typeof filterValue === "string" && filterValue === "") return true;
      if (Array.isArray(filterValue) && filterValue.length === 0) return true;

      // Use custom filter function if provided
      if (config.filterFn) {
        return config.filterFn(item, filterValue);
      }

      // Get field value (supports nested fields like "coach.name")
      const fieldValue = getNestedProperty(item, config.field);

      // Apply filter based on type
      switch (config.type) {
        case "text":
          return applyTextFilter(fieldValue, filterValue as string);

        case "select":
          return compareValues(fieldValue as FilterValue, filterValue);

        case "multiselect":
          return Array.isArray(filterValue) && !Array.isArray(filterValue[0])
            ? (filterValue as (string | number | boolean)[]).includes(
                fieldValue as string | number | boolean,
              )
            : compareValues(String(fieldValue), String(filterValue));

        case "boolean":
          return fieldValue === filterValue;

        case "range": {
          const [min, max] = filterValue as [number, number];
          return (
            typeof fieldValue === "number" &&
            fieldValue >= min &&
            fieldValue <= max
          );
        }

        case "daterange": {
          const [startDate, endDate] = filterValue as [Date, Date];
          const itemDate = new Date(fieldValue as string | number | Date);
          return itemDate >= startDate && itemDate <= endDate;
        }

        default:
          return true;
      }
    });
  };

  // Computed filtered items
  const filteredItems = computed(() => {
    const items = Array.isArray(itemsRef.value) ? itemsRef.value : [];
    return items.filter((item) => passesFilters(item as T));
  }) as ComputedRef<T[]>;

  // Save current filters as preset
  const savePreset = (name: string, description?: string) => {
    const preset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name,
      filters: { ...filterValues.value },
      description,
      createdAt: new Date(),
    };
    presets.value.push(preset);
    saveToStorage();
    return preset;
  };

  // Load a saved preset
  const loadPreset = (presetId: string) => {
    const preset = presets.value.find((p) => p.id === presetId);
    if (preset) {
      filterValues.value = { ...preset.filters };
      activePresetId.value = presetId;
    }
  };

  // Delete a saved preset
  const deletePreset = (presetId: string) => {
    presets.value = presets.value.filter((p) => p.id !== presetId);
    if (activePresetId.value === presetId) {
      activePresetId.value = undefined;
    }
    saveToStorage();
  };

  // Update a preset
  const updatePreset = (presetId: string, updates: Partial<FilterPreset>) => {
    const index = presets.value.findIndex((p) => p.id === presetId);
    if (index !== -1) {
      presets.value[index] = { ...presets.value[index], ...updates };
      saveToStorage();
    }
  };

  // Get filter config for a field
  const getConfigForField = (field: string): FilterConfig | undefined => {
    return configsRef.value.find((c) => c.field === field);
  };

  // Get display value for a filter (for chips)
  const getFilterDisplayValue = (field: string): string => {
    const value = filterValues.value[field];
    const config = getConfigForField(field);

    if (!value || value === "") return "";

    switch (config?.type) {
      case "multiselect":
        if (Array.isArray(value)) {
          return value
            .map((v) => {
              const option = config.options?.find((o) => o.value === v);
              return option?.label ?? v;
            })
            .join(", ");
        }
        break;

      case "select": {
        const option = config?.options?.find((o) => o.value === value);
        return option?.label ?? String(value);
      }

      case "daterange": {
        if (Array.isArray(value) && value.length === 2) {
          const [start, end] = value as [
            Date | string | number,
            Date | string | number,
          ];
          return `${formatDate(start as Date | string)} - ${formatDate(end as Date | string)}`;
        }
        break;
      }

      case "range": {
        if (Array.isArray(value) && value.length === 2) {
          return `${value[0]} - ${value[1]}`;
        }
        break;
      }

      case "boolean":
        return value ? "Yes" : "No";

      case "text":
        return String(value);
    }

    return String(value);
  };

  // Initialize on mount
  initializeFilters();
  loadFromStorage();

  return {
    // State
    filterValues,
    filterValuesRaw: filterValues as Readonly<Ref<FilterValues>>,
    presets,
    activePresetId,

    // Computed
    filteredItems,
    activeFilterCount,
    hasActiveFilters: computed(() => activeFilterCount.value > 0),

    // Methods
    setFilterValue,
    clearFilters,
    savePreset,
    loadPreset,
    deletePreset,
    updatePreset,
    getConfigForField,
    getFilterDisplayValue,

    // Utils
    configs: configsRef,
  };
};

/**
 * Helper: Get nested property from object (supports dot notation)
 */
function getNestedProperty(obj: unknown, path: string): unknown {
  if (typeof obj !== "object" || obj === null) return undefined;
  const keys = path.split(".");
  let result: unknown = obj;
  for (const key of keys) {
    if (typeof result === "object" && result !== null && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return result;
}

/**
 * Helper: Apply text filter with case-insensitive partial matching
 */
function applyTextFilter(fieldValue: unknown, filterValue: string): boolean {
  if (fieldValue === null || fieldValue === undefined) return false;
  const normalizedField = String(fieldValue).toLowerCase().trim();
  const normalizedFilter = filterValue.toLowerCase().trim();
  return normalizedField.includes(normalizedFilter);
}

/**
 * Helper: Format date for display
 */
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
