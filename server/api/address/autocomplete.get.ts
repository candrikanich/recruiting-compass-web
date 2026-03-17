import { defineEventHandler, getQuery } from "h3";
import { useLogger } from "~/server/utils/logger";

interface RadarAddress {
  formattedAddress: string;
  addressLabel: string;
  city: string;
  stateCode: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "address/autocomplete");
  const { q } = getQuery(event);
  const query = String(q ?? "").trim();

  if (query.length < 3) return [];

  const config = useRuntimeConfig();
  if (!config.radarApiKey) {
    logger.error("NUXT_RADAR_API_KEY is not configured");
    return [];
  }

  try {
    const res = await $fetch<{ addresses: RadarAddress[] }>(
      "https://api.radar.io/v1/autocomplete",
      {
        headers: { Authorization: config.radarApiKey },
        params: { query, country: "US", limit: 5 },
      }
    );

    return (res.addresses ?? []).map((a) => ({
      label: a.formattedAddress,
      address: a.addressLabel,
      city: a.city,
      state: a.stateCode,
      zip: a.postalCode,
      latitude: a.latitude,
      longitude: a.longitude,
    }));
  } catch (err) {
    logger.error("Radar.io autocomplete failed", err);
    return [];
  }
});
