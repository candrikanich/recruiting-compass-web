/**
 * Request Body Size Limit Middleware
 * Prevents large payloads from consuming server resources
 * Protects against resource exhaustion and DOS attacks
 */

import { createLogger } from '../utils/logger'

const logger = createLogger('body-size-limit')

// Maximum request body sizes by endpoint type
const SIZE_LIMITS = {
  // Form data and file uploads - moderate limit
  upload: 10 * 1024 * 1024, // 10MB for document uploads
  // JSON API endpoints - reasonable limit for typical data
  api: 1 * 1024 * 1024, // 1MB for API requests
  // Feedback and communication - smaller limit
  feedback: 100 * 1024, // 100KB for feedback forms
  // Default fallback - conservative
  default: 512 * 1024, // 512KB default
}

/**
 * Determine size limit based on request path
 */
function getSizeLimit(path: string): number {
  if (path?.includes('/api/documents/upload')) return SIZE_LIMITS.upload
  if (path?.includes('/api/feedback')) return SIZE_LIMITS.feedback
  if (path?.includes('/api/')) return SIZE_LIMITS.api
  return SIZE_LIMITS.default
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export default defineEventHandler((event) => {
  const path = event.path
  const method = event.method

  // Only check size limits on methods that typically have bodies
  if (!['POST', 'PUT', 'PATCH'].includes(method)) {
    return
  }

  const contentLength = getHeader(event, 'content-length')
  if (!contentLength) {
    return // No Content-Length header, let downstream handle it
  }

  const size = parseInt(contentLength, 10)
  const limit = getSizeLimit(path)

  if (size > limit) {
    logger.warn(
      `Request body too large: ${formatBytes(size)} (limit: ${formatBytes(limit)}) for ${method} ${path}`
    )

    throw createError({
      statusCode: 413,
      statusMessage: 'Payload Too Large',
      data: {
        message: `Request body exceeds maximum allowed size of ${formatBytes(limit)}`,
        maximum: limit,
        received: size,
      },
    })
  }

  // Store the limit on event for logging purposes
  event.context.bodySizeLimit = limit
})
