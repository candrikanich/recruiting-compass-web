import { defineEventHandler, getQuery, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { redis, CACHE_KEYS, TTL } from "~/server/utils/redis";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "schools/high-school-search");
  const { q, state } = getQuery(event);

  const query = String(q ?? "").trim();
  const stateParam = String(state ?? "").trim().toUpperCase();

  if (!query) return [];

  if (query.length < 2) {
    throw createError({ statusCode: 400, statusMessage: "q must be at least 2 characters" });
  }

  const cacheKey = CACHE_KEYS.NCES_SEARCH(query, stateParam);
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return cached;
    } catch (err) {
      logger.warn("Redis cache read failed", err);
    }
  }

  const supabase = useSupabaseAdmin();
  let dbQuery = supabase
    .from("nces_schools")
    .select("nces_id, name, city, state")
    .ilike("name", `%${query}%`);

  dbQuery = dbQuery.order("name", { ascending: true });

  const { data, error } = await dbQuery.limit(8);

  if (error) {
    logger.error("nces_schools query failed", error);
    return [];
  }

  const results = data ?? [];

  // Client-side state bias: sort matching state to front
  const sorted = stateParam
    ? [
        ...results.filter((s) => s.state === stateParam),
        ...results.filter((s) => s.state !== stateParam),
      ]
    : results;

  if (redis && sorted.length > 0) {
    try {
      await redis.set(cacheKey, sorted, { ex: TTL.ONE_HOUR });
    } catch (err) {
      logger.warn("Redis cache write failed", err);
    }
  }

  return sorted;
});
