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
      const isServiceIssue =
        serviceError.statusCode === 0 || serviceError.statusCode >= 500;

      if (isServiceIssue) {
        markServiceUnavailable(serviceError);
      }
    }
  };

  // Hook into Vue's global error handler
  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    console.error("[Global Error Handler]", err, info);
    processError(err);

    // Don't prevent default error handling
    // Let other error handlers run
  };

  // Hook into Nuxt's Vue error handling
  nuxtApp.hook("vue:error", (err, instance, info) => {
    console.error("[Nuxt Vue Error]", err, info);
    processError(err);
  });

  // Hook into unhandled promise rejections
  if (import.meta.client) {
    window.addEventListener("unhandledrejection", (event) => {
      // Stale chunk error: a Vite/Nuxt deploy happened while the user had the
      // app open. Old chunk URLs no longer exist. Reload once to pick up the
      // latest bundles. Guard against reload loops with sessionStorage.
      const reason = event.reason;
      const isChunkError =
        reason instanceof TypeError &&
        (reason.message.includes(
          "Failed to fetch dynamically imported module",
        ) ||
          reason.message.includes("Importing a module script failed"));
      if (isChunkError) {
        const reloadKey = "chunk-reload-attempted";
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          window.location.reload();
        }
        return;
      }

      console.error("[Unhandled Promise Rejection]", event.reason);
      processError(event.reason);
    });
  }
});
