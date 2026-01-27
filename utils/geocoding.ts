/**
 * Geocoding Utility Functions
 * Uses Nominatim (OpenStreetMap) API - free, no API key required
 * Pure functions for address/coordinate conversions
 * Replaces useGeocoding composable for stateless operations
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Geocode an address to coordinates using Nominatim
 * @param address - Full address string (e.g., "123 Main St, Chicago, IL 60601")
 * @returns Coordinates and display name, or null if not found
 * @throws Error if the request fails
 */
export const geocodeAddress = async (
  address: string,
): Promise<GeocodingResult | null> => {
  if (!address.trim()) {
    throw new Error("Address is required");
  }

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
      return null;
    }

    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Geocoding failed";
    console.error("Geocoding error:", err);
    throw new Error(errorMessage);
  }
};

/**
 * Reverse geocode coordinates to an address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Address string, or null if not found
 * @throws Error if the request fails
 */
export const reverseGeocode = async (
  lat: number,
  lng: number,
): Promise<string | null> => {
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
      return null;
    }

    return data.display_name;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Reverse geocoding failed";
    console.error("Reverse geocoding error:", err);
    throw new Error(errorMessage);
  }
};
