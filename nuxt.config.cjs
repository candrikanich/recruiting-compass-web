module.exports = {
  ssr: true,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],

  css: ['~/app.css'],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },


  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },

  typescript: {
    strict: true,
    shim: false,
  },

  nitro: {
    prerender: {
      crawlLinks: false,
    },
    commonjs: {
      esmExternals: false,
    },
  },

  experimental: {
    shallowRef: false,
  },
}
