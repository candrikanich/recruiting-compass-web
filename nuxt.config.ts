export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  // CSR-only: app is auth-gated with heavy client-side state, real-time data, and complex interactive UI
  ssr: false,

  // Exclude heavy PDF/export utils from Nuxt's auto-import scanning so they don't get pulled
  // into the entry bundle. These files use dynamic import() for jspdf/html2canvas internally,
  // but Nuxt's auto-import barrel creates a static re-export that forces vendor-pdf and
  // vendor-charts into the entry chunk on every page. All usages have explicit import
  // statements, so excluding them from auto-imports is safe.
  ignore: [
    "utils/exportUtils.ts",
    "utils/pdfHelpers.ts",
    "utils/performanceExport.ts",
    "utils/reportGenerators.ts",
  ],

  devServer: {
    port: 3003,
  },

  // Workaround for Nuxt 3.21.3+ dev-server crash with ssr:false
  // (NUXT_VITE_NODE_OPTIONS.socketPath not defined). Fix from PR #34959
  // is in 4.x only — backport is queued but unreleased. Remove once Nuxt
  // ships >=3.21.7 with the cherry-pick.
  experimental: {
    viteEnvironmentApi: true,
  },

  css: ["~/assets/css/main.css"],
  modules: ["@pinia/nuxt", "@sentry/nuxt/module", "@nuxt/ui"],

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      link: [
        { rel: "preconnect", href: "https://us.i.posthog.com" },
        { rel: "dns-prefetch", href: "https://us.i.posthog.com" },
      ],
    },
  },

  // Vite caching configuration
  vite: {
    // Cache directory for faster builds
    cacheDir: ".vite",

    // Strip console.* and debugger statements from production bundles.
    // Server-side code uses useLogger(); client-side uses createClientLogger().
    // Direct console calls are dev-only and must not ship to users.
    esbuild: {
      drop:
        process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
    },

    // Pre-bundle frequently used dependencies
    optimizeDeps: {
      include: [
        "@pinia/nuxt",
        "@supabase/supabase-js",
        "chart.js",
        "fuse.js",
        "leaflet",
        "@vueuse/core",
      ],
      exclude: [
        // Exclude PDF libs from pre-bundling: they're only used in lazy export pages
        "html2canvas",
        "jspdf",
        "jspdf-autotable",
      ],
    },

    // Force file hash regeneration on every build to prevent CDN cache issues
    build: {
      rollupOptions: {
        output: {
          // Add timestamp to chunk file names to force new URLs
          chunkFileNames: "_nuxt/[name]-[hash].js",
          entryFileNames: "_nuxt/[name]-[hash].js",
          assetFileNames: "_nuxt/[name]-[hash][extname]",

          // Manual vendor chunking for better caching.
          // NOTE: vendor-pdf (jspdf/html2canvas) is intentionally NOT listed here.
          // When listed as a manualChunk, Rollup places the Vite __vitePreload helper
          // inside vendor-pdf, which forces the browser to fetch all 589 KB of PDF
          // libraries before the entry chunk can execute — even on pages that never use PDF.
          // Without a manualChunk entry, jspdf/html2canvas are bundled only into the
          // ExportModal page chunks and load lazily when the user first triggers export.
          manualChunks: {
            "vendor-charts": [
              "chart.js",
              "vue-chartjs",
              "chartjs-adapter-date-fns",
              "chartjs-plugin-annotation",
            ],
            "vendor-maps": ["leaflet"],
            "vendor-utils": ["fuse.js", "date-fns"],
          },
        },
      },
      chunkSizeWarningLimit: 500, // Warn if any chunk > 500 KB
    },
  },

  nitro: {
    preset: "vercel",
    prerender: {
      crawlLinks: false,
    },
    routeRules: {
      "/.well-known/apple-app-site-association": {
        headers: { "content-type": "application/json" },
      },
      // RFC 9727 — extensionless catalog file needs an explicit linkset content-type.
      "/.well-known/api-catalog": {
        headers: { "content-type": "application/linkset+json; charset=utf-8" },
      },
      // RFC 8631 — service descriptions use the OpenAPI media type.
      "/.well-known/api-docs/public-profile.openapi.json": {
        headers: { "content-type": "application/openapi+json; charset=utf-8" },
      },
      // RFC 8288 Link headers — advertise discoverable resources to agents/crawlers
      // on every response. Relation types are IANA-registered
      // (https://www.iana.org/assignments/link-relations).
      // Vary: Accept lets caches serve both HTML and the text/markdown variant
      // (see server/middleware/agent-markdown.ts) without crossing them.
      "/**": {
        headers: {
          link: [
            '</sitemap.xml>; rel="sitemap"',
            '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
            '</legal/privacy>; rel="privacy-policy"',
            '</legal/terms>; rel="terms-of-service"',
            '</help>; rel="help"',
            '</about>; rel="about"',
          ].join(", "),
          vary: "Accept",
        },
      },
    },
  },

  postcss: {
    plugins: {
      "@tailwindcss/postcss": {},
    },
  },

  runtimeConfig: {
    adminTokenSecret: process.env.NUXT_ADMIN_TOKEN_SECRET || "",
    collegeScorecardApiKey: process.env.NUXT_COLLEGE_SCORECARD_API_KEY || "",
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || "",
      authEnforcementEnabled:
        process.env.NUXT_PUBLIC_AUTH_ENFORCEMENT_ENABLED === "true",
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || "",
      posthogPublicKey: process.env.NUXT_PUBLIC_POSTHOG_PUBLIC_KEY || "",
      posthogHost: "https://us.i.posthog.com",
      posthogDefaults: "2026-01-30",
    },
  },

  sentry: {
    org: "chris-andrikanich",
    project: "javascript-nuxt",
    autoInjectServerSentry: "top-level-import",
  },

  sourcemap: {
    client: "hidden",
  },
});
