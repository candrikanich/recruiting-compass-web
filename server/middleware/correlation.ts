/**
 * Request correlation ID middleware
 *
 * Attaches a unique correlation ID to each request for distributed tracing.
 * - Checks for existing X-Request-ID header (from client or upstream)
 * - Generates new UUID if none exists
 * - Makes ID available in event context for logging
 * - Returns ID in response header for client tracing
 */

export default defineEventHandler((event) => {
  // Check for existing correlation ID from client or upstream proxy
  const existingId = getHeader(event, "x-request-id");

  // Use existing ID or generate new one
  const requestId = existingId || crypto.randomUUID();

  // Store in event context for use in logs and handlers
  event.context.requestId = requestId;

  // Add to response headers so client can correlate
  appendResponseHeader(event, "x-request-id", requestId);
});
