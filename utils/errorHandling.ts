/**
 * Centralized error handling utilities for consistent error management across the application.
 * Provides standardized error message extraction, error handling, and async error handling.
 */

/**
 * Custom application error with context information
 */
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
}

/**
 * Extracts a user-friendly error message from various error types
 * @param error - The error object (Error, string, or unknown)
 * @param defaultMessage - Default message if error cannot be parsed
 * @returns User-friendly error message
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = "An error occurred",
): string {
  // String error
  if (typeof error === "string") {
    return error;
  }

  // Error object with message
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  // Object with message property
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.message === "string") return errorObj.message;
    if (
      errorObj.error &&
      typeof errorObj.error === "object" &&
      errorObj.error !== null
    ) {
      const err = errorObj.error as Record<string, unknown>;
      if (typeof err.message === "string") return err.message;
    }
    if (
      errorObj.data &&
      typeof errorObj.data === "object" &&
      errorObj.data !== null
    ) {
      const data = errorObj.data as Record<string, unknown>;
      if (typeof data.message === "string") return data.message;
    }
  }

  // Fallback
  return defaultMessage;
}

/**
 * Handles errors consistently across the application
 * Logs errors to console and returns structured error response
 * @param error - The error to handle
 * @param context - Additional context information for debugging
 * @returns Structured error object
 */
export function handleError(
  error: unknown,
  context?: Record<string, unknown>,
): AppError {
  const message = getErrorMessage(error);
  const appError = new Error(message) as AppError;

  // Extract status code if available
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;
    appError.statusCode =
      typeof errorObj.statusCode === "number"
        ? errorObj.statusCode
        : typeof errorObj.status === "number"
          ? errorObj.status
          : undefined;
    appError.code =
      typeof errorObj.code === "string" ? errorObj.code : undefined;
    appError.context = context;
  }

  // Log with context for debugging
  console.error("Error:", {
    message: appError.message,
    code: appError.code,
    statusCode: appError.statusCode,
    context,
    originalError: error,
  });

  return appError;
}

/**
 * Wraps async functions with error handling
 * Automatically catches and handles errors with logging
 * @param fn - Async function to wrap
 * @param onError - Optional custom error handler
 * @returns Wrapped function
 */
export function asyncErrorHandler<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  onError?: (error: AppError) => void,
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = handleError(error);
      if (onError) {
        onError(appError);
      }
      return null;
    }
  };
}

/**
 * Validates response data structure
 * @param data - Data to validate
 * @param requiredFields - Array of required field names
 * @returns true if all required fields exist and are non-null
 */
export function validateResponse(
  data: unknown,
  requiredFields: string[],
): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  return requiredFields.every((field) => {
    const value = (data as Record<string, unknown>)[field];
    return value !== undefined && value !== null;
  });
}

/**
 * Formats error for user display
 * Strips technical details and provides user-friendly message
 * @param error - The error to format
 * @param fallback - Fallback message for users
 * @returns User-friendly error message
 */
export function formatUserError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const message = getErrorMessage(error);

  // Strip sensitive information from message
  if (message.includes("API") || message.includes("network")) {
    return "Connection error. Please check your internet and try again.";
  }

  if (message.includes("401") || message.includes("Unauthorized")) {
    return "Your session has expired. Please log in again.";
  }

  if (message.includes("403") || message.includes("Forbidden")) {
    return "You do not have permission to perform this action.";
  }

  if (message.includes("404") || message.includes("not found")) {
    return "The requested resource was not found.";
  }

  if (message.includes("500") || message.includes("Internal")) {
    return "Server error. Please try again later.";
  }

  // Return original message if it's already user-friendly
  if (!message.includes("undefined") && !message.includes("null")) {
    return message;
  }

  return fallback;
}

/**
 * Safe JSON parsing with error handling
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback value
 */
export function safeJsonParse<T = unknown>(
  json: string,
  fallback: T | null = null,
): T | null {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn("Failed to parse JSON:", error);
    return fallback;
  }
}
