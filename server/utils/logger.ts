/**
 * Server-side logging utility
 * Controls log output based on NODE_ENV
 * - Development: Human-readable logs with full details
 * - Production: Structured JSON logs for log aggregation (Datadog, CloudWatch, etc.)
 */

import type { H3Event } from "h3";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  data?: unknown;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
}

interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
}

interface LoggerOptions {
  /** Optional event for request correlation */
  event?: H3Event;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export const logger = createLogger("server");

/**
 * Create a logger with optional request context
 * When event is provided, includes correlation ID and request details
 */
export function createLogger(context: string, options?: LoggerOptions): Logger {
  const isDevelopment =
    process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

  // In production, only log if LOG_LEVEL is explicitly set
  // In development, default to "info"
  const shouldLog = isDevelopment || process.env.LOG_LEVEL !== undefined;
  const configuredLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
  const minLevelPriority = LOG_LEVEL_PRIORITY[configuredLevel];

  // Extract request context if event provided
  const requestContext = options?.event
    ? {
        requestId: options.event.context.requestId as string | undefined,
        userId: options.event.context.user?.id as string | undefined,
        path: options.event.path,
        method: options.event.method,
      }
    : undefined;

  const log = (level: LogLevel, message: string, data?: unknown) => {
    // Skip if logging is disabled (production without explicit LOG_LEVEL)
    if (!shouldLog) {
      return;
    }

    // Skip if below configured level
    if (LOG_LEVEL_PRIORITY[level] < minLevelPriority) {
      return;
    }

    const timestamp = new Date().toISOString();

    if (isDevelopment) {
      const prefix = `[${timestamp}] [${context}] [${level.toUpperCase()}]`;
      const consoleMethod =
        { debug: "log", info: "log", warn: "warn", error: "error" }[level];

      // Include request ID in development logs if available
      const requestSuffix = requestContext?.requestId
        ? ` [req:${requestContext.requestId.slice(0, 8)}]`
        : "";

      if (data) {
        console[consoleMethod as "log" | "warn" | "error"](
          `${prefix}${requestSuffix}`,
          message,
          data,
        );
      } else {
        console[consoleMethod as "log" | "warn" | "error"](
          `${prefix}${requestSuffix}`,
          message,
        );
      }
      return;
    }

    // Production: Structured JSON logging for log aggregation
    const entry: LogEntry = {
      timestamp,
      level: level.toUpperCase(),
      context,
      message,
    };

    // Add request correlation data if available
    if (requestContext) {
      if (requestContext.requestId) entry.requestId = requestContext.requestId;
      if (requestContext.userId) entry.userId = requestContext.userId;
      if (requestContext.path) entry.path = requestContext.path;
      if (requestContext.method) entry.method = requestContext.method;
    }

    if (data !== undefined) {
      entry.data = sanitizeLogData(data);
    }

    // Use console.log for JSON output (logging platforms parse this)
    console.log(JSON.stringify(entry));
  };

  return {
    debug: (message: string, data?: unknown) => log("debug", message, data),
    info: (message: string, data?: unknown) => log("info", message, data),
    warn: (message: string, data?: unknown) => log("warn", message, data),
    error: (message: string, error?: unknown) => log("error", message, error),
  };
}

/**
 * Create a request-aware logger for use in API endpoints
 * Automatically captures correlation ID and user context
 *
 * Usage:
 * ```ts
 * export default defineEventHandler((event) => {
 *   const logger = useLogger(event);
 *   logger.info("Processing request");
 *   // Logs will include requestId, userId, path, method
 * });
 * ```
 */
export function useLogger(event: H3Event, context = "api"): Logger {
  return createLogger(context, { event });
}

/**
 * Sanitize sensitive data before logging
 * Prevents accidental logging of passwords, tokens, etc.
 */
function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Error objects - extract safe properties
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: process.env.NODE_ENV === "development" ? data.stack : undefined,
    };
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  // Handle objects
  if (typeof data === "object") {
    const sensitiveFields = new Set([
      "password",
      "password_hash",
      "token",
      "access_token",
      "refresh_token",
      "api_key",
      "secret",
      "credit_card",
      "ssn",
      "authorization",
      "cookie",
    ]);

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.has(lowerKey) || lowerKey.includes("password")) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeLogData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}
