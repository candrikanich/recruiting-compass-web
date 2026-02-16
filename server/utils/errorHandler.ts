/**
 * Error handling utility for secure error responses
 * Prevents information disclosure while maintaining debugging capability
 * Captures errors to Sentry in production
 */

import * as Sentry from "@sentry/nuxt";
import { createLogger } from "./logger";

const logger = createLogger("error-handler");

/**
 * Capture error in Sentry with context (production only)
 */
function captureInSentry(
  error: unknown,
  level: "error" | "warning" = "error",
  context?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV !== "production" || !process.env.SENTRY_DSN) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("error_details", context);
    }
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error), level);
    }
  });
}

export interface SafeError {
  statusCode: number;
  statusMessage: string;
  data?: {
    message: string;
    details?: string;
  };
}

/**
 * Convert any error to a safe, non-disclosive error response
 * In production: Returns generic messages
 * In development: Returns detailed error information for debugging
 */
export function sanitizeError(error: unknown, defaultCode = 500): SafeError {
  const isDevelopment =
    !process.env.NODE_ENV || process.env.NODE_ENV === "development";
  const isProduction = process.env.NODE_ENV === "production";

  // Handle H3 errors (already have statusCode)
  if (error instanceof Error && "statusCode" in error) {
    const h3Error = error as Error & {
      statusCode?: number;
      statusMessage?: string;
    };
    return {
      statusCode: h3Error.statusCode || defaultCode,
      statusMessage: h3Error.statusMessage || "An error occurred",
      data: {
        message: isDevelopment ? h3Error.message : "An error occurred",
        details: isDevelopment ? h3Error.statusMessage : undefined,
      },
    };
  }

  // Handle standard errors
  if (error instanceof SyntaxError) {
    logger.error("Syntax error", error);
    captureInSentry(error, "error", { type: "syntax_error" });
    return {
      statusCode: 400,
      statusMessage: "Bad Request",
      data: {
        message: isDevelopment ? error.message : "Invalid request format",
      },
    };
  }

  if (error instanceof TypeError) {
    logger.error("Type error", error);
    captureInSentry(error, "error", { type: "type_error" });
    return {
      statusCode: 400,
      statusMessage: "Bad Request",
      data: {
        message: isDevelopment ? error.message : "Invalid request data",
      },
    };
  }

  if (error instanceof Error) {
    // Log full error for debugging
    logger.error("Unhandled error", error);
    captureInSentry(error, "error", { type: "unhandled_error" });

    // Return sanitized response
    return {
      statusCode: defaultCode,
      statusMessage: isProduction ? "Internal Server Error" : error.message,
      data: {
        message: isProduction ? "An error occurred" : error.message,
        details: isDevelopment ? error.stack : undefined,
      },
    };
  }

  // Unknown error type
  logger.error("Unknown error type", error);
  captureInSentry(error, "error", { type: "unknown_error" });
  return {
    statusCode: defaultCode,
    statusMessage: "Internal Server Error",
    data: {
      message: isProduction ? "An error occurred" : String(error),
    },
  };
}

/**
 * Safe error response factory
 * Creates properly formatted error responses for API endpoints
 */
export function createSafeErrorResponse(
  error: unknown,
  context: string,
  defaultCode = 500,
): SafeError {
  logger.error(`Error in ${context}`, error);
  captureInSentry(error, "error", { context });
  return sanitizeError(error, defaultCode);
}

/**
 * Database error sanitizer
 * Prevents leaking database schema or query details
 */
export function sanitizeDatabaseError(error: unknown): SafeError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Recognize common database errors and provide generic response
    if (
      message.includes("unique constraint") ||
      message.includes("unique violation")
    ) {
      return {
        statusCode: 409,
        statusMessage: "Conflict",
        data: {
          message: "This record already exists",
        },
      };
    }

    if (message.includes("foreign key") || message.includes("no rows")) {
      return {
        statusCode: 404,
        statusMessage: "Not Found",
        data: {
          message: "Resource not found",
        },
      };
    }

    if (message.includes("permission denied") || message.includes("rls")) {
      return {
        statusCode: 403,
        statusMessage: "Forbidden",
        data: {
          message: "You do not have permission to access this resource",
        },
      };
    }
  }

  // Generic database error
  logger.error("Database error", error);
  captureInSentry(error, "error", { type: "database_error" });
  return {
    statusCode: 500,
    statusMessage: "Internal Server Error",
    data: {
      message: "A database error occurred",
    },
  };
}

/**
 * External API error sanitizer
 * Prevents leaking API credentials or internal service details
 */
export function sanitizeExternalApiError(
  error: unknown,
  serviceName: string,
): SafeError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Don't expose API keys or credentials
    if (
      message.includes("api") ||
      message.includes("key") ||
      message.includes("credential")
    ) {
      logger.error(`${serviceName} authentication error`, error);
      return {
        statusCode: 503,
        statusMessage: "Service Unavailable",
        data: {
          message: `${serviceName} is currently unavailable`,
        },
      };
    }

    // Timeout errors
    if (message.includes("timeout") || message.includes("econnrefused")) {
      logger.error(`${serviceName} connection timeout`, error);
      return {
        statusCode: 504,
        statusMessage: "Gateway Timeout",
        data: {
          message: `${serviceName} is not responding`,
        },
      };
    }
  }

  logger.error(`${serviceName} error`, error);
  return {
    statusCode: 502,
    statusMessage: "Bad Gateway",
    data: {
      message: `Error communicating with ${serviceName}`,
    },
  };
}
