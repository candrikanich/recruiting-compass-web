import type { H3Event } from 'h3'
import { setHeader, getCookie } from 'h3'
import { createLogger } from '../utils/logger'

const logger = createLogger('rate-limit')

/**
 * In-memory rate limiting cache with LRU eviction.
 * Tracks request count per IP + path (or authenticated user ID if available).
 *
 * NOTE: This is suitable for single-instance deployments. For distributed deployments,
 * upgrade to Redis-backed rate limiting:
 * 1. Set REDIS_URL environment variable
 * 2. Install Redis client: npm install redis
 * 3. Uncomment Redis implementation below
 *
 * Production deployment considerations:
 * - Single instance: In-memory cache is sufficient
 * - Multiple instances: Use Redis for shared rate limit state
 * - High traffic: Consider dedicated rate limiting service (e.g., Cloudflare, AWS WAF)
 */
class RateLimitCache {
  private cache = new Map<string, { count: number; resetTime: number }>()
  private maxSize = 1000
  private cleanupInterval = 60000 // 1 minute

  constructor() {
    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), this.cleanupInterval)
  }

  /**
   * Check if request is allowed and increment counter
   * Returns true if request is within limits, false if rate limited
   */
  isAllowed(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
    const now = Date.now()
    const entry = this.cache.get(key)

    if (!entry) {
      // New entry
      this.cache.set(key, { count: 1, resetTime: now + windowMs })
      return { allowed: true, remaining: limit - 1 }
    }

    if (now > entry.resetTime) {
      // Window expired, reset
      entry.count = 1
      entry.resetTime = now + windowMs
      return { allowed: true, remaining: limit - 1 }
    }

    // Within window
    entry.count++
    const remaining = Math.max(0, limit - entry.count)
    const allowed = entry.count <= limit

    if (!allowed) {
      logger.warn(`Rate limit exceeded for key: ${key} (${entry.count}/${limit})`)
    }

    return { allowed, remaining }
  }

  /**
   * Remove expired entries
   */
  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key)
      }
    }

    // Keep cache size under control
    if (this.cache.size > this.maxSize) {
      const entriesToDelete = Math.ceil(this.maxSize * 0.2)
      let deleted = 0
      for (const [key] of this.cache.entries()) {
        if (deleted >= entriesToDelete) break
        this.cache.delete(key)
        deleted++
      }
    }
  }
}

const rateLimitCache = new RateLimitCache()

/**
 * Rate limit configuration per endpoint type
 */
interface RateLimitConfig {
  limit: number
  windowMs: number
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Auth endpoints are strict (prevent brute force)
  auth: { limit: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  // Social media sync endpoints are resource-intensive
  social: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  // Standard API endpoints
  api: { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute
  // Default fallback
  default: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
}

/**
 * Determines which rate limit config to use based on request path
 */
function getEndpointConfig(path: string): RateLimitConfig {
  if (path?.includes('/api/auth')) return RATE_LIMIT_CONFIGS.auth
  if (path?.includes('/api/social')) return RATE_LIMIT_CONFIGS.social
  if (path?.includes('/api/')) return RATE_LIMIT_CONFIGS.api
  return RATE_LIMIT_CONFIGS.default
}

/**
 * Extract client IP from request
 * Handles X-Forwarded-For header for proxied requests
 */
function getClientIp(event: H3Event): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return getHeader(event, 'x-real-ip') ||
    event.node.req.socket.remoteAddress ||
    'unknown'
}

/**
 * Rate limiting middleware
 * Enforces request rate limits per IP and endpoint type
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
export default defineEventHandler((event) => {
  const ip = getClientIp(event)
  const path = event.path
  const config = getEndpointConfig(path)

  // Use authenticated user ID if available for more accurate rate limiting
  // Falls back to IP + path for anonymous requests
  const userId = getCookie(event, 'sb-access-token') ? `user:${ip}` : `ip:${ip}`
  const key = `${userId}:${path}`

  const result = rateLimitCache.isAllowed(key, config.limit, config.windowMs)

  // Add rate limit headers to response
  const retryAfterSeconds = Math.ceil(config.windowMs / 1000)
  setHeader(event, 'X-RateLimit-Limit', String(config.limit))
  setHeader(event, 'X-RateLimit-Remaining', String(result.remaining))
  setHeader(event, 'X-RateLimit-Reset', String(Math.ceil((Date.now() + config.windowMs) / 1000)))

  if (!result.allowed) {
    setHeader(event, 'Retry-After', retryAfterSeconds)
    logger.warn(`Rate limit exceeded: ${key}`)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      data: {
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: retryAfterSeconds,
      },
    })
  }
})
