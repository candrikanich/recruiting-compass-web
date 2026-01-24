/**
 * Error handling composable
 * Provides type-safe error extraction and logging
 */

import { isRecord, isString } from "~/utils/typeGuards";

export interface ErrorContext {
  context?: string;
  details?: Record<string, unknown>;
}

export interface UseErrorHandlerReturn {
  getErrorMessage: (err: unknown, ctx?: ErrorContext) => string;
  logError: (err: unknown, ctx?: ErrorContext) => void;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  function getErrorMessage(err: unknown, ctx?: ErrorContext): string {
    if (err instanceof Error) {
      return err.message;
    }

    if (isString(err)) {
      return err;
    }

    if (isRecord(err)) {
      if ("message" in err && isString(err.message)) {
        return err.message;
      }
      if ("statusMessage" in err && isString(err.statusMessage)) {
        return err.statusMessage;
      }
    }

    return `An unexpected error occurred${ctx?.context ? ` in ${ctx.context}` : ""}`;
  }

  function logError(err: unknown, ctx?: ErrorContext): void {
    const message = getErrorMessage(err, ctx);
    console.error(`[${ctx?.context || "Error"}]`, message, ctx?.details);
  }

  return { getErrorMessage, logError };
};
