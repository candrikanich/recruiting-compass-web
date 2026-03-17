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

  css: ["~/assets/css/main.css"],
  modules: ["@pinia/nuxt", "@sentry/nuxt/module", "@nuxt/ui"],

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
    },
  },

  // Vite caching configuration
  vite: {
    // Cache directory for faster builds
    cacheDir: ".vite",

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
      '/.well-known/apple-app-site-association': {
        headers: { 'content-type': 'application/json' },
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
    radarApiKey: process.env.NUXT_RADAR_API_KEY || "",
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || "",
      authEnforcementEnabled:
        process.env.NUXT_PUBLIC_AUTH_ENFORCEMENT_ENABLED === "true",
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || "",
      posthogPublicKey: process.env.NUXT_PUBLIC_POSTHOG_PUBLIC_KEY || "",
      posthogHost: 'https://us.i.posthog.com',
      posthogDefaults: '2026-01-30'
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
