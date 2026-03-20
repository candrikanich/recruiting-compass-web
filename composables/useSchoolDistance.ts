/**
 * School Distance Calculation Composable
 *
 * Computes distances from home location to all schools and caches results
 * Uses Haversine formula for accurate geographic distance calculation
 */

import { computed, type ComputedRef } from "vue";
import type { School } from "~/types";
import type { HomeLocation } from "~/types/models";
import { calculateDistance, formatDistance } from "~/utils/distance";

export function useSchoolDistance(
  schools: ComputedRef<School[]>,
  homeLocation: ComputedRef<HomeLocation | null>,
) {
  const distanceCache = computed(() => {
    const cache = new Map<string, number>();
    const location = homeLocation.value;

    if (!location?.latitude || !location?.longitude) {
      return cache;
    }

    schools.value.forEach((school) => {
      const coords = school.academic_info;
      const coordLat = coords?.latitude;
      const coordLng = coords?.longitude;

      if (
        coordLat &&
        coordLng &&
        typeof coordLat === "number" &&
        typeof coordLng === "number"
      ) {
        cache.set(
          school.id,
          calculateDistance(
            {
              latitude: location.latitude ?? 0,
              longitude: location.longitude ?? 0,
            },
            { latitude: coordLat, longitude: coordLng },
          ),
        );
      }
    });

    return cache;
  });

  return { distanceCache };
}

/**
 * Helper to extract coordinates from object with optional chaining
 */
function extractCoordinates(
  location:
    | { latitude?: number | null; longitude?: number | null }
    | null
    | undefined,
): { latitude: number; longitude: number } | null {
  if (!location?.latitude || !location?.longitude) return null;
  return {
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

/**
 * Composable for calculating distance from home to a single school.
 *
 * Accepts homeLocation explicitly so the caller controls when/how preferences
 * are loaded — avoids creating a private usePreferenceManager instance that
 * never has loadAllPreferences() called on it.
 *
 * @param school - Ref to the school entity
 * @param homeLocation - ComputedRef from the caller's usePreferenceManager instance
 * @returns Computed formatted distance string or null if coordinates unavailable
 *
 * @example
 * const { getHomeLocation, loadAllPreferences } = usePreferenceManager();
 * await loadAllPreferences();
 * const distanceFromHome = useSingleSchoolDistance(school, getHomeLocation);
 */
export function useSingleSchoolDistance(
  school: import("vue").Ref<School | null>,
  homeLocation: import("vue").ComputedRef<HomeLocation | null>,
) {
  return computed(() => {
    const schoolCoords = extractCoordinates(school.value?.academic_info);
    const homeCoords = extractCoordinates(homeLocation.value);

    if (!schoolCoords || !homeCoords) return null;

    const distance = calculateDistance(homeCoords, schoolCoords);
    return formatDistance(distance);
  });
}
