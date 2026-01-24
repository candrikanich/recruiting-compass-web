/**
 * Distance calculation utilities using the Haversine formula
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the distance between two geographic coordinates using the Haversine formula
 * @param from - Starting coordinates
 * @param to - Destination coordinates
 * @returns Distance in miles
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 3958.8; // Earth's radius in miles

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param miles - Distance in miles
 * @returns Formatted string (e.g., "150 miles" or "1,234 miles")
 */
export function formatDistance(miles: number): string {
  return `${miles.toLocaleString()} miles`;
}
