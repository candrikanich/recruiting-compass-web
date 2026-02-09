/**
 * School Distance Calculation Composable
 *
 * Computes distances from home location to all schools and caches results
 * Uses Haversine formula for accurate geographic distance calculation
 */

import { computed, type ComputedRef } from "vue";
import type { School } from "~/types";
import type { HomeLocation } from "~/types/models";
import { calculateDistance } from "~/utils/distance";

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
