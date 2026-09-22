import type { H3Event } from "h3";
import { setHeader, getCookie, getHeader } from "h3";
import { createLogger } from "../utils/logger";
import { rateLimitByKey } from "../utils/rateLimit";

const logger = createLogger("rate-limit");

/**
 * Rate limit configuration per endpoint type
 */
interface RateLimitConfig {
  limit: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Auth endpoints are strict (prevent brute force)
  auth: { limit: 5, window: "1 m" }, // 5 requests per minute
  // Standard API endpoints
  api: { limit: 60, window: "1 m" }, // 60 requests per minute
  // Default fallback
  default: { limit: 100, window: "1 m" }, // 100 requests per minute
};

/**
 * Determines which rate limit config to use based on request path
 */
function getEndpointConfig(path: string): RateLimitConfig {
  if (path?.includes("/api/auth")) return RATE_LIMIT_CONFIGS.auth;
  if (path?.includes("/api/")) return RATE_LIMIT_CONFIGS.api;
  return RATE_LIMIT_CONFIGS.default;
}

/**
 * Extract client IP from request
 * Handles X-Forwarded-For header for proxied requests
 */
function getClientIp(event: H3Event): string {
  const forwarded = getHeader(event, "x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (
    getHeader(event, "x-real-ip") ||
    event.node.req.socket.remoteAddress ||
    "unknown"
  );
}

/**
 * Rate limiting middleware
 * Enforces request rate limits per IP and endpoint type
 *
 * Backed by the same Upstash Redis limiter used by rateLimitByIp/rateLimitByUser
 * (server/utils/rateLimit.ts) -- a shared store across concurrent Vercel
 * function instances, not per-instance in-memory state (#914). Degrades to an
 * open bypass (no limiting) if UPSTASH_REDIS_REST_URL/TOKEN aren't configured,
 * same as every other caller of that utility -- rate limiting is defense in
 * depth, not the primary auth boundary, so failing open here rather than
 * 500ing every request is the existing, deliberate tradeoff.
 *
 * @example
 * // Applied globally in nuxt.config.ts
 * export default defineNuxtConfig({
 *   ssr: false,
 *   nitro: {
 *     prerender: {
 *       crawlLinks: false,
 *     },
 *     middleware: ['~/server/middleware/rate-limit'],
 *   },
 * })
 */
export default defineEventHandler(async (event) => {
  // Rate limiting is only meaningful in production. In development and test
  // environments the only traffic is the developer or the E2E suite — applying
  // limits here causes false 429s during automated test runs.
  if (process.env.NODE_ENV !== "production") return;

  const ip = getClientIp(event);
  const path = event.path;
  const config = getEndpointConfig(path);

  // Use authenticated user ID if available for more accurate rate limiting
  // Uses the last 20 chars of the token as a per-user identifier without
  // the cost of JWT decoding. Falls back to IP for anonymous requests.
  const token = getCookie(event, "sb-access-token");
  const userId = token ? `user:${token.slice(-20)}` : `ip:${ip}`;
  const key = `${userId}:${path}`;

  const result = await rateLimitByKey(event, key, {
    requests: config.limit,
    window: config.window,
  });

  // Add rate limit headers to response
  setHeader(event, "X-RateLimit-Limit", String(config.limit));
  setHeader(event, "X-RateLimit-Remaining", String(result.remaining));
  setHeader(event, "X-RateLimit-Reset", String(Math.ceil(result.reset / 1000)));

  if (!result.success) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000),
    );
    setHeader(event, "Retry-After", retryAfterSeconds);
    logger.warn(`Rate limit exceeded: ${key}`);
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
      data: {
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: retryAfterSeconds,
      },
    });
  }
});
