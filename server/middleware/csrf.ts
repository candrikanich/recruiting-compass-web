import { requireCsrfToken } from '../utils/csrf'
import type { H3Event } from 'h3'

/**
 * CSRF protection middleware
 * Validates CSRF tokens on all state-changing HTTP methods
 *
 * POST, PUT, PATCH, DELETE requests must include valid CSRF token
 * GET and HEAD requests are safe and don't require CSRF protection
 *
 * @example
 * // Applied globally in nuxt.config.ts
 * export default defineNuxtConfig({
 *   nitro: {
 *     middleware: ['~/server/middleware/csrf'],
 *   },
 * })
 */
export default defineEventHandler((event) => {
  const method = event.node.req.method
  const path = event.path

  // Only validate CSRF for state-changing methods
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (!stateChangingMethods.includes(method || '')) {
    return // GET, HEAD, OPTIONS, etc. don't need CSRF protection
  }

  // Skip CSRF for auth endpoints (they use other protections)
  // and for endpoints that don't require authentication
  if (path?.startsWith('/api/auth')) {
    return
  }

  // Skip CSRF for public endpoints
  const publicEndpoints = [
    '/api/csrf-token', // Token generation endpoint
    '/api/health', // Health check
  ]

  if (publicEndpoints.some(endpoint => path?.startsWith(endpoint))) {
    return
  }

  // Validate CSRF token for protected endpoints
  requireCsrfToken(event)
})
