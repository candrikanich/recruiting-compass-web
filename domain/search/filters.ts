import type { SearchEntity, SearchFilters } from "./types";

/** Reset / empty-filter snapshot used by clearFilters. */
export function createEmptySearchFilters(): SearchFilters {
  return {
    schools: { division: "", state: "", verified: null },
    coaches: { sport: "", responseRate: 0, verified: null },
    interactions: {
      sentiment: "",
      direction: "",
      dateFrom: "",
      dateTo: "",
    },
    metrics: { metricType: "", minValue: 0, maxValue: 100 },
  };
}

/**
 * A filter value counts as "active" when it is not the empty/zero/false/null default.
 * Preserves the historical predicate (including maxValue=100 counting as active).
 */
export function isFilterValueActive(value: unknown): boolean {
  return value !== "" && value !== 0 && value !== false && value !== null;
}

export function isSearchFiltering(filters: SearchFilters): boolean {
  return Object.values(filters).some((filterGroup) =>
    Object.values(filterGroup).some(isFilterValueActive),
  );
}

export function readFilterValue(
  filters: SearchFilters,
  category: SearchEntity,
  filterName: string,
): unknown {
  const group = filters[category] as unknown as Record<string, unknown>;
  return group?.[filterName] || null;
}
