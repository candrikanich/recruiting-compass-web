import * as Sentry from "@sentry/nuxt";

Sentry.init({
  dsn: useRuntimeConfig().public.sentryDsn as string,

  tracesSampleRate: import.meta.dev ? 1.0 : 0.2,

  replaysSessionSampleRate: import.meta.dev ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.replayIntegration()],

  enableLogs: true,

  debug: false,
});
