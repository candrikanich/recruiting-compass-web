import { describe, it, expect, beforeEach } from "vitest";
import { useServiceStatus } from "~/composables/useServiceStatus";

describe("useServiceStatus", () => {
  beforeEach(() => {
    // Reset state before each test
    const { markServiceAvailable } = useServiceStatus();
    markServiceAvailable();
  });

  describe("initial state", () => {
    it("should initialize with service available", () => {
      const { isServiceUnavailable, lastError, consecutiveErrors } =
        useServiceStatus();

      expect(isServiceUnavailable.value).toBe(false);
      expect(lastError.value).toBeNull();
      expect(consecutiveErrors.value).toBe(0);
    });

    it("should not show error page initially", () => {
      const { shouldShowErrorPage } = useServiceStatus();

      expect(shouldShowErrorPage()).toBe(false);
    });
  });

  describe("detectErrorType", () => {
    it("should detect network errors (fetch failures)", () => {
      const { detectErrorType } = useServiceStatus();
      const error = new TypeError("Failed to fetch");

      const serviceError = detectErrorType(error);

      expect(serviceError).not.toBeNull();
      expect(serviceError?.statusCode).toBe(0);
      expect(serviceError?.service).toBe("supabase");
      expect(serviceError?.message).toContain("Network error");
    });

    it("should detect Supabase errors with status code", () => {
      const { detectErrorType } = useServiceStatus();
      const error = {
        status: 503,
        message: "Service Unavailable",
      };

      const serviceError = detectErrorType(error);

      expect(serviceError).not.toBeNull();
      expect(serviceError?.statusCode).toBe(503);
      expect(serviceError?.service).toBe("supabase");
      expect(serviceError?.message).toBe("Service Unavailable");
    });

    it("should detect API errors with statusCode property", () => {
      const { detectErrorType } = useServiceStatus();
      const error = {
        statusCode: 500,
        message: "Internal Server Error",
      };

      const serviceError = detectErrorType(error);

      expect(serviceError).not.toBeNull();
      expect(serviceError?.statusCode).toBe(500);
      expect(serviceError?.service).toBe("api");
    });

    it("should return null for non-service errors", () => {
      const { detectErrorType } = useServiceStatus();
      const error = new Error("Regular error");

      const serviceError = detectErrorType(error);

      expect(serviceError).toBeNull();
    });

    it("should handle errors without message", () => {
      const { detectErrorType } = useServiceStatus();
      const error = {
        status: 500,
      };

      const serviceError = detectErrorType(error);

      expect(serviceError?.message).toBe("Service error");
    });
  });

  describe("markServiceUnavailable", () => {
    it("should NOT show error page on first 500 error (threshold logic)", () => {
      const { markServiceUnavailable, isServiceUnavailable } =
        useServiceStatus();

      markServiceUnavailable({
        service: "supabase",
        statusCode: 500,
        message: "Server error",
        timestamp: new Date(),
        retryCount: 0,
      });

      // First error shouldn't trigger full page
      expect(isServiceUnavailable.value).toBe(false);
    });

    it("should show error page on second consecutive 500 error", () => {
      const { markServiceUnavailable, isServiceUnavailable } =
        useServiceStatus();

      // First error
      markServiceUnavailable({
        service: "supabase",
        statusCode: 500,
        message: "Server error",
        timestamp: new Date(),
        retryCount: 0,
      });

      // Second error - should trigger
      markServiceUnavailable({
        service: "supabase",
        statusCode: 502,
        message: "Bad Gateway",
        timestamp: new Date(),
        retryCount: 0,
      });

      expect(isServiceUnavailable.value).toBe(true);
    });

    it("should show error page immediately on network error (status 0)", () => {
      const { markServiceUnavailable, isServiceUnavailable } =
        useServiceStatus();

      markServiceUnavailable({
        service: "supabase",
        statusCode: 0,
        message: "Network error",
        timestamp: new Date(),
        retryCount: 0,
      });

      // Network errors show immediately
      expect(isServiceUnavailable.value).toBe(true);
    });

    it("should reset consecutive errors on 4xx error", () => {
      const { markServiceUnavailable, consecutiveErrors, isServiceUnavailable } =
        useServiceStatus();

      // First 500 error
      markServiceUnavailable({
        service: "supabase",
        statusCode: 500,
        message: "Server error",
        timestamp: new Date(),
        retryCount: 0,
      });

      expect(consecutiveErrors.value).toBe(1);

      // 401 error (client error) - should reset counter
      markServiceUnavailable({
        service: "supabase",
        statusCode: 401,
        message: "Unauthorized",
        timestamp: new Date(),
        retryCount: 0,
      });

      expect(consecutiveErrors.value).toBe(0);
      expect(isServiceUnavailable.value).toBe(false);
    });

    it("should track last error", () => {
      const { markServiceUnavailable, lastError } = useServiceStatus();
      const error = {
        service: "supabase" as const,
        statusCode: 503,
        message: "Service Unavailable",
        timestamp: new Date(),
        retryCount: 0,
      };

      markServiceUnavailable(error);

      expect(lastError.value).toEqual(error);
    });

    it("should increment consecutive errors for multiple 500s", () => {
      const { markServiceUnavailable, consecutiveErrors } = useServiceStatus();

      markServiceUnavailable({
        service: "supabase",
        statusCode: 500,
        message: "Error 1",
        timestamp: new Date(),
        retryCount: 0,
      });
      expect(consecutiveErrors.value).toBe(1);

      markServiceUnavailable({
        service: "supabase",
        statusCode: 502,
        message: "Error 2",
        timestamp: new Date(),
        retryCount: 0,
      });
      expect(consecutiveErrors.value).toBe(2);

      markServiceUnavailable({
        service: "supabase",
        statusCode: 503,
        message: "Error 3",
        timestamp: new Date(),
        retryCount: 0,
      });
      expect(consecutiveErrors.value).toBe(3);
    });
  });

  describe("markServiceAvailable", () => {
    it("should reset all state when marking service available", () => {
      const {
        markServiceUnavailable,
        markServiceAvailable,
        isServiceUnavailable,
        lastError,
        consecutiveErrors,
      } = useServiceStatus();

      // Trigger error state
      markServiceUnavailable({
        service: "supabase",
        statusCode: 0,
        message: "Network error",
        timestamp: new Date(),
        retryCount: 0,
      });

      expect(isServiceUnavailable.value).toBe(true);
      expect(lastError.value).not.toBeNull();

      // Mark as available
      markServiceAvailable();

      expect(isServiceUnavailable.value).toBe(false);
      expect(lastError.value).toBeNull();
      expect(consecutiveErrors.value).toBe(0);
    });
  });

  describe("getErrorMessage", () => {
    it("should return default message when no error", () => {
      const { getErrorMessage, markServiceAvailable } = useServiceStatus();

      markServiceAvailable();

      expect(getErrorMessage()).toBe("Service temporarily unavailable");
    });

    it("should return network error message for status 0", () => {
      const { markServiceUnavailable, getErrorMessage } = useServiceStatus();

      markServiceUnavailable({
        service: "supabase",
        statusCode: 0,
        message: "Network error",
        timestamp: new Date(),
        retryCount: 0,
      });

      const message = getErrorMessage();
      expect(message).toContain("internet connection");
    });

    it("should return service provider message for 500+ errors", () => {
      const { markServiceUnavailable, getErrorMessage } = useServiceStatus();

      markServiceUnavailable({
        service: "supabase",
        statusCode: 503,
        message: "Service Unavailable",
        timestamp: new Date(),
        retryCount: 0,
      });

      const message = getErrorMessage();
      expect(message).toContain("service provider");
      expect(message).toContain("technical difficulties");
    });
  });

  describe("integration scenarios", () => {
    it("should handle mixed error sequences correctly", () => {
      const { markServiceUnavailable, isServiceUnavailable, consecutiveErrors } =
        useServiceStatus();

      // 500 error
      markServiceUnavailable({
        service: "supabase",
        statusCode: 500,
        message: "Error",
        timestamp: new Date(),
        retryCount: 0,
      });
      expect(consecutiveErrors.value).toBe(1);
      expect(isServiceUnavailable.value).toBe(false);

      // 404 error (resets)
      markServiceUnavailable({
        service: "supabase",
        statusCode: 404,
        message: "Not Found",
        timestamp: new Date(),
        retryCount: 0,
      });
      expect(consecutiveErrors.value).toBe(0);

      // Another 500
      markServiceUnavailable({
        service: "supabase",
        statusCode: 500,
        message: "Error",
        timestamp: new Date(),
        retryCount: 0,
      });
      expect(consecutiveErrors.value).toBe(1);
      expect(isServiceUnavailable.value).toBe(false);

      // Second 500 - should trigger
      markServiceUnavailable({
        service: "supabase",
        statusCode: 503,
        message: "Unavailable",
        timestamp: new Date(),
        retryCount: 0,
      });
      expect(consecutiveErrors.value).toBe(2);
      expect(isServiceUnavailable.value).toBe(true);
    });

    it("should handle recovery flow", () => {
      const {
        markServiceUnavailable,
        markServiceAvailable,
        isServiceUnavailable,
        consecutiveErrors,
      } = useServiceStatus();

      // Trigger error state
      markServiceUnavailable({
        service: "supabase",
        statusCode: 0,
        message: "Network error",
        timestamp: new Date(),
        retryCount: 0,
      });

      expect(isServiceUnavailable.value).toBe(true);

      // Service recovers
      markServiceAvailable();

      expect(isServiceUnavailable.value).toBe(false);
      expect(consecutiveErrors.value).toBe(0);

      // Should require threshold again
      markServiceUnavailable({
        service: "supabase",
        statusCode: 500,
        message: "Error",
        timestamp: new Date(),
        retryCount: 0,
      });
      expect(isServiceUnavailable.value).toBe(false);
    });

    it("should distinguish between different 500-level errors", () => {
      const { markServiceUnavailable, isServiceUnavailable } =
        useServiceStatus();

      const errors = [500, 502, 503, 504];

      errors.forEach((statusCode, index) => {
        if (index === 0) {
          // First error - no page shown
          markServiceUnavailable({
            service: "supabase",
            statusCode,
            message: `Error ${statusCode}`,
            timestamp: new Date(),
            retryCount: 0,
          });
          expect(isServiceUnavailable.value).toBe(false);
        } else {
          // Subsequent errors - page shown after second
          markServiceUnavailable({
            service: "supabase",
            statusCode,
            message: `Error ${statusCode}`,
            timestamp: new Date(),
            retryCount: 0,
          });
          expect(isServiceUnavailable.value).toBe(true);
          return; // Exit after second error
        }
      });
    });
  });
});
