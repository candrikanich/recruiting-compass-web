/**
 * School Filter Configuration Factory
 *
 * Creates reusable filter configurations for the schools page
 * Encapsulates filter logic and UI configuration
 */

import type { ComputedRef } from "vue";
import type { School } from "~/types";
import type { HomeLocation } from "~/types/models";
import type { FilterConfig, FilterValue } from "~/types/filters";
import { extractStateFromLocation } from "~/utils/locationParser";

export function createSchoolFilterConfigs(
  stateOptions: ComputedRef<{ value: string; label: string }[]>,
  getHomeLocation: ComputedRef<HomeLocation | null>,
  distanceCache: ComputedRef<Map<string, number>>,
): FilterConfig[] {
  return [
    {
      type: "text",
      field: "name",
      label: "Search",
      placeholder: "School name or location...",
      filterFn: (
        item: Record<string, unknown>,
        filterValue: FilterValue,
      ): boolean => {
        if (!filterValue) return true;
        const school = item as unknown as School;
        const query = String(filterValue).toLowerCase();
        return (
          school.name.toLowerCase().includes(query) ||
          school.location?.toLowerCase().includes(query) ||
          false
        );
      },
    },
    {
      type: "select",
      field: "division",
      label: "Division",
      options: [
        { value: "D1", label: "Division 1" },
        { value: "D2", label: "Division 2" },
        { value: "D3", label: "Division 3" },
        { value: "NAIA", label: "NAIA" },
        { value: "JUCO", label: "JUCO" },
      ],
    },
    {
      type: "select",
      field: "status",
      label: "Status",
      options: [
        { value: "researching", label: "Researching" },
        { value: "contacted", label: "Contacted" },
        { value: "interested", label: "Interested" },
        { value: "offer_received", label: "Offer Received" },
        { value: "committed", label: "Committed" },
      ],
    },
    { type: "boolean", field: "is_favorite", label: "Favorites Only" },
    {
      type: "select",
      field: "state",
      label: "State",
      options: stateOptions.value,
      filterFn: (
        item: Record<string, unknown>,
        filterValue: FilterValue,
      ): boolean => {
        const school = item as unknown as School;
        let schoolState: string | undefined =
          school.academic_info?.state || (school.state as string | undefined);
        if (!schoolState && school.location) {
          schoolState = extractStateFromLocation(school.location) || undefined;
        }
        return schoolState === filterValue;
      },
    },
    {
      type: "range",
      field: "fit_score",
      label: "Fit Score",
      min: 0,
      max: 100,
      step: 5,
      defaultValue: [0, 100] as [number, number],
      filterFn: (
        item: Record<string, unknown>,
        filterValue: FilterValue,
      ): boolean => {
        const school = item as unknown as School;
        const score = school.fit_score;
        if (score === null || score === undefined) return true;
        const rangeValue = filterValue as { min?: number; max?: number } | null;
        return (
          score >= (rangeValue?.min ?? 0) && score <= (rangeValue?.max ?? 100)
        );
      },
    },
    {
      type: "range",
      field: "distance",
      label: "Distance",
      min: 0,
      max: 3000,
      step: 50,
      defaultValue: [0, 3000] as [number, number],
      filterFn: (
        item: Record<string, unknown>,
        filterValue: FilterValue,
      ): boolean => {
        const school = item as unknown as School;
        const homeLoc = getHomeLocation.value;
        if (!homeLoc?.latitude || !homeLoc?.longitude) return true;
        const distance = distanceCache.value.get(school.id);
        if (distance === undefined) return true;
        const rangeValue = filterValue as { max?: number } | null;
        return distance <= (rangeValue?.max ?? 3000);
      },
    },
  ];
}
