import { defineNuxtConfig } from 'nuxt/config'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

export default defineNuxtConfig({
  compatibilityDate: '2025-12-05',
  ssr: false,
  devtools: { enabled: false },
  telemetry: {
    enabled: false,
  },
  experimental: {
    appManifest: false,
  },
  typescript: {
    includeWorkspace: true,
    builder: 'shared' as const,
  },
  nitro: {
    prerender: {
      routes: ['/'],
    },
    output: {
      publicDir: '.output/public',
    },
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    // Server-only (secure)
    twitterBearerToken: '',
    twitterApiSecret: '',
    twitterApiKey: '',
    instagramAccessToken: '',
    instagramAppSecret: '',
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  },
})
