<template>
  <div class="min-h-screen bg-gray-50">
    <Header />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Sub-navigation tabs -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="flex gap-6">
          <NuxtLink
            to="/performance"
            class="pb-3 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900 font-semibold"
          >
            Performance Overview
          </NuxtLink>
          <NuxtLink
            to="/performance/timeline"
            class="pb-3 px-1 border-b-2 border-blue-600 text-blue-600 font-semibold"
          >
            Timeline & Analytics
          </NuxtLink>
        </nav>
      </div>

      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Performance Timeline & Analytics</h1>
        <p class="text-gray-600 mt-1">Track your progress over time and compare metrics across events</p>
      </div>

      <!-- Filters Bar -->
      <TimelineFilters
        v-model:dateRange="dateRange"
        v-model:verifiedOnly="verifiedOnly"
        @export="handleExport"
        @advanced-export="showExportModal = true"
      />

      <!-- Loading State -->
      <div v-if="loading" class="space-y-8">
        <div class="bg-white rounded-lg shadow p-6 h-96 animate-pulse"></div>
        <div class="bg-white rounded-lg shadow p-6 h-96 animate-pulse"></div>
      </div>

      <!-- Charts -->
      <div v-else class="space-y-8">
        <!-- Power Metrics Chart -->
        <PerformanceChart
          title="Power Metrics"
          :metrics="powerMetrics"
          :metric-types="['velocity', 'exit_velo']"
          category="power"
          :show-comparison="true"
        />

        <!-- Speed Metrics Chart -->
        <PerformanceChart
          title="Speed Metrics"
          :metrics="speedMetrics"
          :metric-types="['sixty_time', 'pop_time']"
          category="speed"
          :show-comparison="true"
        />

        <!-- Hitting & Pitching (2-column grid) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PerformanceChart
            title="Hitting Metrics"
            :metrics="hittingMetrics"
            :metric-types="['batting_avg']"
            category="hitting"
            :show-comparison="false"
          />

          <PerformanceChart
            title="Pitching Metrics"
            :metrics="pitchingMetrics"
            :metric-types="['era', 'strikeouts']"
            category="pitching"
            :show-comparison="false"
          />
        </div>

        <!-- Radar Chart: Current Performance Snapshot -->
        <PerformanceRadarChart :latest-metrics="latestMetricsByType" />
      </div>

      <!-- Export Modal -->
      <ExportModal
        v-if="showExportModal"
        :metrics="filteredMetrics"
        :events="filteredEvents"
        context="timeline"
        @close="showExportModal = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePerformance } from '~/composables/usePerformance'
import { useEvents } from '~/composables/useEvents'
import ExportModal from '~/components/Performance/ExportModal.vue'
import type { PerformanceMetric } from '~/types/models'

definePageMeta({ middleware: 'auth' })

// Composables
const { metrics, fetchMetrics, loading: metricsLoading } = usePerformance()
const { events, fetchEvents, loading: eventsLoading } = useEvents()

// State
const dateRange = ref({
  preset: 'last_3_months',
  startDate: '',
  endDate: ''
})
const verifiedOnly = ref(false)
const showExportModal = ref(false)

const loading = computed(() => metricsLoading.value || eventsLoading.value)

// Computed: Filter metrics by verification
const filteredMetrics = computed(() => {
  if (!verifiedOnly.value) return metrics.value
  return metrics.value.filter(m => m.verified)
})

// Computed: Categorize metrics
const powerMetrics = computed(() =>
  filteredMetrics.value.filter(m => ['velocity', 'exit_velo'].includes(m.metric_type))
)
const speedMetrics = computed(() =>
  filteredMetrics.value.filter(m => ['sixty_time', 'pop_time'].includes(m.metric_type))
)
const hittingMetrics = computed(() =>
  filteredMetrics.value.filter(m => m.metric_type === 'batting_avg')
)
const pitchingMetrics = computed(() =>
  filteredMetrics.value.filter(m => ['era', 'strikeouts'].includes(m.metric_type))
)

// Computed: Filter events by date range
const filteredEvents = computed(() => {
  if (!dateRange.value.startDate || !dateRange.value.endDate) return events.value
  return events.value.filter(e =>
    e.start_date >= dateRange.value.startDate && e.start_date <= dateRange.value.endDate
  )
})

// Computed: Latest metrics by type for radar
const latestMetricsByType = computed(() => {
  const latest: Record<string, PerformanceMetric> = {}
  const allTypes = ['velocity', 'exit_velo', 'sixty_time', 'pop_time', 'batting_avg', 'era', 'strikeouts', 'other']

  allTypes.forEach(type => {
    const metricsOfType = filteredMetrics.value
      .filter(m => m.metric_type === type)
      .sort((a, b) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime())

    if (metricsOfType.length > 0) {
      latest[type] = metricsOfType[0]
    }
  })

  return latest
})

// Methods
const calculateDateRange = () => {
  const now = new Date()
  let start = new Date()

  switch (dateRange.value.preset) {
    case 'last_30_days':
      start.setDate(now.getDate() - 30)
      break
    case 'last_3_months':
      start.setMonth(now.getMonth() - 3)
      break
    case 'last_6_months':
      start.setMonth(now.getMonth() - 6)
      break
    case 'last_12_months':
      start.setMonth(now.getMonth() - 12)
      break
    case 'all_time':
      start = new Date('2020-01-01')
      break
    case 'custom':
      return
  }

  dateRange.value.startDate = start.toISOString().split('T')[0]
  dateRange.value.endDate = now.toISOString().split('T')[0]
}

const handleExport = (format: 'csv' | 'json') => {
  if (format === 'csv') {
    const csv = convertMetricsToCSV(filteredMetrics.value)
    downloadFile(csv, `performance-timeline-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
  } else {
    const json = JSON.stringify(filteredMetrics.value, null, 2)
    downloadFile(json, `performance-timeline-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
  }
}

const convertMetricsToCSV = (metricsData: PerformanceMetric[]): string => {
  const headers = ['Date', 'Metric Type', 'Value', 'Unit', 'Event ID', 'Verified', 'Notes']
  const rows = metricsData.map(m => [
    m.recorded_date,
    m.metric_type,
    m.value.toString(),
    m.unit || '',
    m.event_id || '',
    m.verified ? 'Yes' : 'No',
    m.notes || ''
  ])

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
}

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Lifecycle
onMounted(async () => {
  calculateDateRange()
  await Promise.all([
    fetchMetrics({
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate
    }),
    fetchEvents()
  ])
})

// Watchers
watch(() => dateRange.value.preset, () => {
  if (dateRange.value.preset !== 'custom') {
    calculateDateRange()
  }
})

watch([() => dateRange.value.startDate, () => dateRange.value.endDate], async () => {
  if (dateRange.value.startDate && dateRange.value.endDate) {
    await fetchMetrics({
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate
    })
  }
})
</script>
