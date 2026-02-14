/**
 * Global error handler plugin
 *
 * Intercepts unhandled errors and routes them through centralized
 * service status detection. Shows Service Unavailable page for
 * service outages.
 */

export default defineNuxtPlugin((nuxtApp) => {
  const { detectErrorType, markServiceUnavailable } = useServiceStatus();

  /**
   * Process error and update service status if needed
   */
  const processError = (error: unknown): void => {
    const serviceError = detectErrorType(error);

    if (serviceError) {
      // Check if this is a service-level error (500+, network)
      const isServiceIssue = serviceError.statusCode === 0 || serviceError.statusCode >= 500;

      if (isServiceIssue) {
        markServiceUnavailable(serviceError);
      }
    }
  };

  // Hook into Vue's global error handler
  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    console.error('[Global Error Handler]', err, info);
    processError(err);

    // Don't prevent default error handling
    // Let other error handlers run
  };

  // Hook into Nuxt's Vue error handling
  nuxtApp.hook('vue:error', (err, instance, info) => {
    console.error('[Nuxt Vue Error]', err, info);
    processError(err);
  });

  // Hook into unhandled promise rejections
  if (import.meta.client) {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Unhandled Promise Rejection]', event.reason);
      processError(event.reason);
    });
  }
});
