import { defineEventHandler, getQuery } from "h3";
import { useLogger } from "~/server/utils/logger";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    "ISO3166-2-lvl4"?: string; // e.g. "US-IL"
  };
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "address/autocomplete");
  const { q } = getQuery(event);
  const query = String(q ?? "").trim();

  if (query.length < 3) return [];

  try {
    const results = await $fetch<NominatimResult[]>(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: query,
          format: "json",
          addressdetails: 1,
          countrycodes: "us",
          limit: 5,
        },
        headers: {
          // Nominatim usage policy requires a descriptive User-Agent
          "User-Agent": "TheRecruitingCompass/1.0 (recruiting-compass-web)",
        },
      }
    );

    return results.map((r) => {
      const a = r.address;
      const streetParts = [a.house_number, a.road].filter(Boolean);
      const street = streetParts.length ? streetParts.join(" ") : "";
      const city = a.city ?? a.town ?? a.village ?? "";
      // Extract 2-letter code from "US-IL" → "IL"
      const stateCode = a["ISO3166-2-lvl4"]?.split("-")[1] ?? a.state ?? "";

      return {
        label: r.display_name,
        address: street,
        city,
        state: stateCode,
        zip: a.postcode ?? "",
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
      };
    });
  } catch (err) {
    logger.error("Nominatim autocomplete failed", err);
    return [];
  }
});
