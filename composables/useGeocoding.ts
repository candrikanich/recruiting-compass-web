/**
 * Geocoding composable using Nominatim (OpenStreetMap) API
 * Free, no API key required
 */

import { ref } from "vue";
import type { GeocodingResult } from "~/utils/geocoding";

export const useGeocoding = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Geocode an address to coordinates using Nominatim
   * @param address - Full address string (e.g., "123 Main St, Chicago, IL 60601")
   * @returns Coordinates and display name, or null if not found
   */
  const geocodeAddress = async (
    address: string,
  ): Promise<GeocodingResult | null> => {
    if (!address.trim()) {
      error.value = "Address is required";
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
        {
          headers: {
            "User-Agent": "BaseballRecruitingTracker/1.0",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        error.value = "Address not found";
        return null;
      }

      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
      };
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Geocoding failed";
      console.error("Geocoding error:", err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Reverse geocode coordinates to an address
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Address string, or null if not found
   */
  const reverseGeocode = async (
    lat: number,
    lng: number,
  ): Promise<string | null> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            "User-Agent": "BaseballRecruitingTracker/1.0",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.display_name) {
        error.value = "Location not found";
        return null;
      }

      return data.display_name;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Reverse geocoding failed";
      console.error("Reverse geocoding error:", err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    geocodeAddress,
    reverseGeocode,
  };
};
