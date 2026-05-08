import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getRequestIP, createError } from "h3";
import type { H3Event } from "h3";

interface RateLimitOptions {
  requests: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const BYPASS_RESULT: RateLimitResult = {
  success: true,
  limit: 0,
  remaining: 0,
  reset: 0,
};

function createLimiter(options: RateLimitOptions): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(options.requests, options.window),
  });
}

async function safeLimit(
  fn: () => Promise<RateLimitResult>,
): Promise<RateLimitResult> {
  try {
    return await fn();
  } catch {
    return BYPASS_RESULT;
  }
}

export async function rateLimitByIp(
  event: H3Event,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const limiter = createLimiter(options);
  if (!limiter) return BYPASS_RESULT;
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  return safeLimit(() => limiter.limit(ip));
}

export async function rateLimitByUser(
  event: H3Event,
  userId: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const limiter = createLimiter(options);
  if (!limiter) return BYPASS_RESULT;
  return safeLimit(() => limiter.limit(userId));
}

export function throwIfRateLimited(
  result: Pick<RateLimitResult, "success" | "reset">,
): void {
  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    throw createError({
      statusCode: 429,
      statusMessage: "Too many requests",
      data: { retryAfter },
    });
  }
}
