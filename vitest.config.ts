import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],

    // Use glob patterns instead of explicit file list
    include: [
      'tests/unit/**/*.spec.ts',
      'tests/integration/**/*.spec.ts'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.nuxt/',
      'tests/e2e/**',
    ],

    // Optimize based on environment
    // Local: use 8 workers, no isolation = fast
    // CI: use 2 workers, with isolation = stable memory
    maxWorkers: process.env.CI ? 2 : 8,
    minWorkers: 1,
    isolate: process.env.CI ? true : false,
    testTimeout: 10000,
    teardownTimeout: 5000,
    logHeapUsage: process.env.CI ? true : false,
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '#app': fileURLToPath(new URL('./node_modules/nuxt/dist/app', import.meta.url)),
      '#': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})