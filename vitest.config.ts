import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/composables/useSearch.spec.ts',
      'tests/unit/composables/useSavedSearches.spec.ts',
      'tests/unit/composables/useCommunicationTemplates.spec.ts',
      'tests/unit/composables/useFollowUpReminders.spec.ts',
      'tests/unit/composables/useCollaboration.spec.ts',
      'tests/unit/composables/useSupabase.spec.ts',
      'tests/unit/composables/useAuth.spec.ts',
      'tests/unit/composables/useOffers.critical.spec.ts',
      'tests/unit/composables/useCoachAnalytics.critical.spec.ts',
      'tests/unit/composables/useRecovery.spec.ts',
      'tests/unit/composables/errorScenarios.spec.ts',
      'tests/unit/components/Analytics/PieChart.spec.ts',
      'tests/unit/components/Analytics/ScatterChart.spec.ts',
      'tests/unit/components/Analytics/FunnelChart.spec.ts',
      'tests/unit/components/Interaction/InterestCalibration.spec.ts',
      'tests/unit/components/Interaction/EmailSendModal.spec.ts',
      'tests/unit/pages/schools-id-coaches.spec.ts',
      'tests/unit/pages/schools-id-detail-notes.spec.ts',
      'tests/unit/pages/schools-id-detail-pros-cons.spec.ts',
      'tests/unit/pages/schools-id-interactions.spec.ts',
      'tests/integration/phase4.integration.spec.ts',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.nuxt/',
      'tests/e2e/**',
      'tests/unit/composables/useCoaches.spec.ts',
      'tests/unit/composables/useInteractions.spec.ts',
      'tests/unit/composables/useInteractions.extended.spec.ts',
      'tests/unit/composables/useSchools.spec.ts',
      'tests/unit/composables/useDocuments.spec.ts',
      'tests/unit/composables/useOffers.spec.ts',
    ],
    // Memory management for CI
    testTimeout: 10000,
    isolate: true,
    teardownTimeout: 5000,
    maxWorkers: 2,
    logHeapUsage: true,
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '#app': fileURLToPath(new URL('./node_modules/nuxt/dist/app', import.meta.url)),
      '#': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})