/**
 * Client-side correlation ID plugin
 *
 * Generates a correlation ID for the session and adds it to all API requests.
 * This enables tracing requests from client → server → database.
 */

const CORRELATION_STORAGE_KEY = "correlation-id";

function getOrCreateCorrelationId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  // Try to get existing ID from sessionStorage
  const existing = sessionStorage.getItem(CORRELATION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  // Generate new ID
  const newId = crypto.randomUUID();
  sessionStorage.setItem(CORRELATION_STORAGE_KEY, newId);
  return newId;
}

export default defineNuxtPlugin(() => {
  // Generate or retrieve correlation ID for this session
  const correlationId = getOrCreateCorrelationId();

  // Add correlation ID to all API requests
  const api = $fetch.create({
    onRequest({ options }) {
      // Add correlation ID header
      const headers = new Headers(options.headers);
      headers.set("x-request-id", correlationId);
      options.headers = headers;
    },
    onResponse({ response }) {
      // Store the server's correlation ID (may be different if it generated a new one)
      const serverRequestId = response.headers.get("x-request-id");
      if (serverRequestId) {
        sessionStorage.setItem(CORRELATION_STORAGE_KEY, serverRequestId);
      }
    },
  });

  // Provide correlation utilities
  return {
    provide: {
      correlation: {
        /** Current session correlation ID */
        id: correlationId,
        /** Regenerate correlation ID for a new session/trace */
        regenerate: () => {
          const newId = crypto.randomUUID();
          sessionStorage.setItem(CORRELATION_STORAGE_KEY, newId);
          return newId;
        },
      },
      // Provide correlated fetch for API calls
      api,
    },
  };
});
