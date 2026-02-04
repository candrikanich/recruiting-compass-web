/**
 * Universal Filter System - Type Definitions
 * Provides reusable filter configuration and state types
 */

export type FilterType =
  | "text"
  | "select"
  | "multiselect"
  | "daterange"
  | "boolean"
  | "range";

export type FilterValue =
  | string
  | number
  | boolean
  | Date
  | [number, number]
  | [Date, Date]
  | { min?: number; max?: number }
  | (string | number | boolean)[]
  | null
  | undefined;

export interface FilterOption {
  value: string | number | boolean;
  label: string;
  icon?: string;
  color?: string;
}

export interface FilterConfig<T extends FilterValue = FilterValue> {
  /** Unique identifier for this filter */
  id?: string;

  /** Filter type (text, select, multiselect, daterange, boolean, range) */
  type: FilterType;

  /** Object field to filter on */
  field: string;

  /** Display label for UI */
  label: string;

  /** Options for select/multiselect filters */
  options?: FilterOption[];

  /** Default value when filter is reset */
  defaultValue?: T;

  /** Custom filter function (overrides field-based filtering) */
  filterFn?: (item: Record<string, unknown>, value: T) => boolean;

  /** Show in filter UI (default: true) */
  visible?: boolean;

  /** Filter is required (cannot be cleared) */
  required?: boolean;

  /** Placeholder text for text inputs */
  placeholder?: string;

  /** Help text or description */
  helpText?: string;

  /** For range filters: minimum value */
  min?: number;

  /** For range filters: maximum value */
  max?: number;

  /** For range filters: step/increment */
  step?: number;

  /** For daterange filters: preset options */
  presets?: DateRangePreset[];
}

export interface DateRangePreset {
  label: string;
  getValue: () => [Date, Date];
}

export interface FilterValues {
  [key: string]: FilterValue;
}

export interface FilterPreset {
  /** Unique preset identifier */
  id: string;

  /** User-friendly preset name */
  name: string;

  /** Filters applied in this preset */
  filters: FilterValues;

  /** Description of what this preset shows */
  description?: string;

  /** When this preset was created */
  createdAt?: Date;

  /** Mark as default preset */
  isDefault?: boolean;
}

export interface FilterState {
  /** Current filter values */
  values: FilterValues;

  /** Active filter count */
  activeCount: number;

  /** Applied filter presets */
  presets: FilterPreset[];

  /** Currently selected preset ID */
  activePresetId?: string;

  /** Whether filters are dirty (changed since last save) */
  isDirty: boolean;
}

export interface UseUniversalFilterOptions {
  /** Storage key for localStorage persistence */
  storageKey?: string;

  /** Enable localStorage persistence (default: true) */
  persistState?: boolean;

  /** Debounce filter changes in milliseconds (default: 300) */
  debounceMs?: number;

  /** Custom comparison function for filter values */
  compareValues?: (a: FilterValue, b: FilterValue) => boolean;
}
