export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  ssr: false,

  devServer: {
    port: 3003,
  },

  css: ["~/assets/css/main.css"],

  modules: ["@pinia/nuxt"],

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
  },

  nitro: {
    preset: "vercel",
    prerender: {
      crawlLinks: false,
    },
    rollupConfig: {
      external: ["isomorphic-dompurify"],
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
    },
  },
});
