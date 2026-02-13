/**
 * Global service status management
 *
 * Tracks external service availability (Supabase, APIs) and determines
 * when to show the Service Unavailable error page.
 */

import { ref } from 'vue';

interface ServiceError {
  service: 'supabase' | 'api' | 'other';
  statusCode: number;
  message: string;
  timestamp: Date;
  retryCount: number;
}

// Module-level state (shared across all instances - acts as singleton)
const isServiceUnavailable = ref<boolean>(false);
const lastError = ref<ServiceError | null>(null);
const consecutiveErrors = ref<number>(0);

export const useServiceStatus = () => {

  /**
   * Detect error type and categorize it
   */
  const detectErrorType = (error: unknown): ServiceError | null => {
    // Network errors (fetch failures, timeouts)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        service: 'supabase',
        statusCode: 0,
        message: 'Network error - service unreachable',
        timestamp: new Date(),
        retryCount: 0,
      };
    }

    // Check if error has status code (HTTP error)
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;

      // Supabase error format
      if ('status' in err && typeof err.status === 'number') {
        return {
          service: 'supabase',
          statusCode: err.status,
          message: err.message as string || 'Service error',
          timestamp: new Date(),
          retryCount: 0,
        };
      }

      // Fetch response error
      if ('statusCode' in err && typeof err.statusCode === 'number') {
        return {
          service: 'api',
          statusCode: err.statusCode,
          message: err.message as string || 'API error',
          timestamp: new Date(),
          retryCount: 0,
        };
      }
    }

    return null;
  };

  /**
   * Determine if an error is a service unavailability error (500+, network)
   */
  const isServiceError = (error: ServiceError): boolean => {
    // Network errors (status 0) are always service errors
    if (error.statusCode === 0) {
      return true;
    }

    // 500-level errors are service errors
    if (error.statusCode >= 500) {
      return true;
    }

    return false;
  };

  /**
   * Mark service as unavailable
   * Uses threshold logic to prevent flapping on single errors
   */
  const markServiceUnavailable = (error: ServiceError): void => {
    lastError.value = error;

    if (!isServiceError(error)) {
      // Not a service error (4xx, etc.) - reset counter
      consecutiveErrors.value = 0;
      return;
    }

    consecutiveErrors.value += 1;

    // Threshold logic:
    // - Network errors (statusCode 0): Show immediately
    // - Server errors (500+): Show after 2 consecutive errors
    const shouldShow =
      error.statusCode === 0 ||
      consecutiveErrors.value >= 2;

    if (shouldShow) {
      isServiceUnavailable.value = true;
    }
  };

  /**
   * Mark service as available (successful request)
   */
  const markServiceAvailable = (): void => {
    isServiceUnavailable.value = false;
    lastError.value = null;
    consecutiveErrors.value = 0;
  };

  /**
   * Should we show the error page?
   */
  const shouldShowErrorPage = (): boolean => {
    return isServiceUnavailable.value;
  };

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = (): string => {
    if (!lastError.value) {
      return 'Service temporarily unavailable';
    }

    if (lastError.value.statusCode === 0) {
      return 'Unable to connect to our services. Please check your internet connection.';
    }

    if (lastError.value.statusCode >= 500) {
      return 'Our service provider is experiencing technical difficulties. Please try again in a few minutes.';
    }

    return 'Service temporarily unavailable';
  };

  return {
    // State
    isServiceUnavailable,
    lastError,
    consecutiveErrors,

    // Methods
    detectErrorType,
    markServiceUnavailable,
    markServiceAvailable,
    shouldShowErrorPage,
    getErrorMessage,
  };
};
