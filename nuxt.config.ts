export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  ssr: false,

  devServer: {
    port: 3003,
  },

  css: ["~/assets/css/main.css"],
  modules: ["@pinia/nuxt", "@sentry/nuxt/module"],

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
        "vue",
        "@pinia/nuxt",
        "@supabase/supabase-js",
        "chart.js",
        "fuse.js",
        "leaflet",
        "@vueuse/core",
        "date-fns",
      ],
      exclude: [
        // These are heavy or change often; exclude for rebunding on change
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

          // Manual vendor chunking for better caching
          manualChunks: {
            "vendor-pdf": ["jspdf", "jspdf-autotable", "html2canvas"],
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

  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  runtimeConfig: {
    adminTokenSecret: process.env.NUXT_ADMIN_TOKEN_SECRET || "",
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || "",
      collegeScorecardApiKey:
        process.env.NUXT_PUBLIC_COLLEGE_SCORECARD_API_KEY || "",
      authEnforcementEnabled:
        process.env.NUXT_PUBLIC_AUTH_ENFORCEMENT_ENABLED === "true",
      useConsolidatedComposables:
        process.env.NUXT_PUBLIC_USE_CONSOLIDATED_COMPOSABLES === "true",
      serverSidePreferences:
        process.env.NUXT_PUBLIC_SERVER_SIDE_PREFERENCES === "true",
      // Phase 3: Composable Consolidation feature flags
      useConsolidatedFiles:
        process.env.NUXT_PUBLIC_USE_CONSOLIDATED_FILES !== "false",
      useConsolidatedPerformance:
        process.env.NUXT_PUBLIC_USE_CONSOLIDATED_PERFORMANCE !== "false",
      useConsolidatedInteractions:
        process.env.NUXT_PUBLIC_USE_CONSOLIDATED_INTERACTIONS !== "false",
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || "",
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
