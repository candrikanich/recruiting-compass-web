type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_FIELDS = new Set([
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

function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (data instanceof Error) {
    return { name: data.name, message: data.message };
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      const lower = key.toLowerCase();
      if (SENSITIVE_FIELDS.has(lower) || lower.includes("password")) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Create a structured client-side logger.
 *
 * Usage in composables:
 * ```ts
 * import { createClientLogger } from "~/utils/logger";
 * const logger = createClientLogger("useSchools");
 * logger.info("fetchSchools called", { familyId });
 * logger.error("Fetch failed", err);
 * ```
 *
 * Log level is controlled by the VITE_LOG_LEVEL env var (debug/info/warn/error).
 * Defaults to "warn" in production, "debug" in development.
 */
export function createClientLogger(context: string): Logger {
  const isDev = import.meta.env.DEV;
  const configuredLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) ||
    (isDev ? "debug" : "warn");
  const minPriority = LOG_LEVEL_PRIORITY[configuredLevel] ?? 2;

  const log = (level: LogLevel, message: string, data?: unknown) => {
    if (LOG_LEVEL_PRIORITY[level] < minPriority) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${context}] [${level.toUpperCase()}]`;
    const consoleMethod: "log" | "warn" | "error" =
      level === "warn" ? "warn" : level === "error" ? "error" : "log";

    if (data !== undefined) {
      console[consoleMethod](prefix, message, sanitizeData(data));
    } else {
      console[consoleMethod](prefix, message);
    }
  };

  return {
    debug: (msg, data?) => log("debug", msg, data),
    info: (msg, data?) => log("info", msg, data),
    warn: (msg, data?) => log("warn", msg, data),
    error: (msg, data?) => log("error", msg, data),
  };
}
