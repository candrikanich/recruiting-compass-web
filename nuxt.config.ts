export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  ssr: false,

  devServer: {
    port: 3003,
  },

  css: ["~/assets/css/main.css"],

  modules: ["@pinia/nuxt"],

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
    preset: process.env.NODE_ENV === "production" ? "static" : "node",
    hooks:
      process.env.NODE_ENV === "production"
        ? {
            close: async () => {
              // Force process exit after prerender completes
              process.exit(0);
            },
          }
        : undefined,
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || "",
      collegeScorecardApiKey:
        process.env.NUXT_PUBLIC_COLLEGE_SCORECARD_API_KEY || "",
    },
  },
});
