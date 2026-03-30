/**
 * GET /api/cron/health-ping
 * Daily health check: verifies the site is reachable and warms Upstash cache
 * with common college search queries so production users get cache hits.
 *
 * Schedule: 0 12 * * * (noon UTC / 8 AM ET)
 * Security: Vercel sends CRON_SECRET as "Authorization: Bearer <secret>".
 */

import { defineEventHandler, createError, getHeader } from "h3";
import { useLogger } from "~/server/utils/logger";
import { verifySharedSecret } from "~/server/utils/secrets";
import { redis, CACHE_KEYS, TTL } from "~/server/utils/redis";

const COLLEGE_SCORECARD_BASE =
  "https://api.data.gov/ed/collegescorecard/v1/schools";

// Common search terms athletes use — warming these covers the majority of traffic
const WARM_QUERIES = [
  "alabama",
  "arizona",
  "florida",
  "georgia",
  "michigan",
  "ohio state",
  "stanford",
  "duke",
  "kentucky",
  "tennessee",
];

// Pages to verify the site is serving traffic (must be publicly accessible)
const PUBLIC_PATHS = ["/", "/login"];

interface HealthResult {
  siteUp: boolean;
  redisUp: boolean;
  pagesChecked: { path: string; status: number }[];
  cacheWarmed: number;
  cacheSkipped: number; // already cached — no Scorecard call needed
  errors: string[];
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "cron/health-ping");

  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = getHeader(event, "authorization");
  const legacyHeader = getHeader(event, "x-cron-secret");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const providedSecret = bearerSecret ?? legacyHeader;

  if (
    !expectedSecret ||
    !providedSecret ||
    !verifySharedSecret(providedSecret, expectedSecret)
  ) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const result: HealthResult = {
    siteUp: false,
    redisUp: false,
    pagesChecked: [],
    cacheWarmed: 0,
    cacheSkipped: 0,
    errors: [],
  };

  // 1. Ping Redis
  if (redis) {
    try {
      await redis.ping();
      result.redisUp = true;
    } catch (err) {
      result.errors.push("Redis ping failed");
      logger.error("Redis ping failed", err);
    }
  } else {
    result.errors.push("Redis client not initialized — check UPSTASH env vars");
  }

  // 2. Verify public pages are reachable
  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://myrecruitingcompass.com";

  for (const path of PUBLIC_PATHS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      let res: Response;
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: "HEAD",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      result.pagesChecked.push({ path, status: res.status });
      if (res.ok) {
        result.siteUp = true;
      } else {
        result.errors.push(`${path} returned ${res.status} ${res.statusText}`);
        logger.warn(`Page health check failed for ${path}`, { status: res.status });
      }
    } catch (err) {
      result.errors.push(`Failed to reach ${path}`);
      logger.error(`Page health check failed for ${path}`, err);
    }
  }

  // 3. Warm Upstash cache with common college search queries
  // Calls College Scorecard directly (server-side, no user auth required).
  // Skips queries already in cache to avoid unnecessary API calls.
  if (redis) {
    const config = useRuntimeConfig();
    const apiKey = config.collegeScorecardApiKey as string;

    if (!apiKey) {
      result.errors.push(
        "NUXT_COLLEGE_SCORECARD_API_KEY not set — skipping cache warmup",
      );
      logger.warn("College Scorecard API key missing, skipping cache warmup");
    } else {
      for (const query of WARM_QUERIES) {
        const cacheKey = CACHE_KEYS.COLLEGE_SEARCH(query);

        try {
          // Skip if already cached (TTL is 30 days — only stale entries need warming)
          const existing = await redis.get(cacheKey);
          if (existing) {
            result.cacheSkipped++;
            continue;
          }

          const params = new URLSearchParams({
            api_key: apiKey,
            "school.name": query,
            per_page: "10",
          });

          const scorecardController = new AbortController();
          const scorecardTimeoutId = setTimeout(
            () => scorecardController.abort(),
            5000,
          );
          let response: Response;
          try {
            response = await fetch(
              `${COLLEGE_SCORECARD_BASE}?${params.toString()}`,
              { signal: scorecardController.signal },
            );
          } finally {
            clearTimeout(scorecardTimeoutId);
          }

          if (!response.ok) {
            result.errors.push(
              `Scorecard API returned ${response.status} for "${query}"`,
            );
            continue;
          }

          const data = await response.json();
          await redis.set(cacheKey, data, { ex: TTL.THIRTY_DAYS });
          result.cacheWarmed++;
        } catch (err) {
          result.errors.push(`Cache warmup failed for "${query}"`);
          logger.warn(`Cache warmup failed for query "${query}"`, err);
        }
      }
    }
  }

  const status =
    result.siteUp && result.errors.length === 0 ? "healthy" : "degraded";
  logger.info(`Health ping complete — ${status}`, result);

  return { status, ...result };
});
