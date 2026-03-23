import * as Sentry from "@sentry/nuxt";

Sentry.init({
  dsn: useRuntimeConfig().public.sentryDsn as string,

  tracesSampleRate: import.meta.dev ? 1.0 : 0.2,

  replaysSessionSampleRate: import.meta.dev ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.replayIntegration()],

  enableLogs: true,

  debug: false,

  ignoreErrors: [
    // Vite HMR failures in dev — Safari surfaces these as unhandled rejections
    // when the module graph is in a transient state during a hot update.
    // These never occur in production (no HMR) and are not actionable.
    /mod\.default/,
    // Stale chunk errors — browser has old chunk URLs after a Vite rebuild (dev)
    // or a production deploy. The page just needs a refresh; not a code bug.
    // Safari surfaces the same failure as "Importing a module script failed".
    /Failed to fetch dynamically imported module/,
    /Importing a module script failed/,
    /Unable to preload CSS/,
    // Nuxt dev-server manifest fetch — /_nuxt/builds/meta/dev.json only exists
    // in the Vite dev server. When the server restarts mid-session, Nuxt can't
    // fetch it and Sentry captures the linked FetchError. Not possible in prod.
    /builds\/meta\/dev\.json/,
  ],
});
