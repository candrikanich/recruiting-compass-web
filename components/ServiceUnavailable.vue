<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-95"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
  >
    <div class="max-w-md px-8 py-10 text-center">
      <!-- Icon -->
      <div class="mb-6 flex justify-center">
        <svg
          class="h-20 w-20 text-amber-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <!-- Title -->
      <h1 class="mb-4 text-2xl font-bold text-white">
        Service Temporarily Unavailable
      </h1>

      <!-- Message -->
      <p class="mb-6 text-gray-300">
        {{ errorMessage }}
      </p>

      <!-- Additional info -->
      <p class="mb-8 text-sm text-gray-400">
        We apologize for the inconvenience. This is typically resolved within a few minutes.
      </p>

      <!-- Try Again button -->
      <button
        type="button"
        class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        @click="handleRetry"
      >
        Try Again
      </button>

      <!-- Status info (if available) -->
      <div v-if="lastError" class="mt-8 text-xs text-gray-500">
        <p>Error code: {{ lastError.statusCode || 'Network Error' }}</p>
        <p>Time: {{ formatTime(lastError.timestamp) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getErrorMessage, lastError, markServiceAvailable } = useServiceStatus();

const errorMessage = computed(() => getErrorMessage());

/**
 * Handle retry button click
 * Refreshes the page to attempt reconnection
 */
const handleRetry = (): void => {
  // Reset service status
  markServiceAvailable();

  // Reload the page
  window.location.reload();
};

/**
 * Format timestamp for display
 */
const formatTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString();
};
</script>
