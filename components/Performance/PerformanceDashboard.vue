<template>
  <div class="space-y-8">
    <!-- Summary Statistics Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-lg p-6 border bg-gradient-to-br from-blue-100 to-blue-50 border-blue-200">
        <p class="text-sm font-semibold uppercase text-slate-600">Total Metrics</p>
        <p class="text-3xl font-bold mt-2 text-slate-900">{{ metrics.length }}</p>
        <p class="text-xs mt-1 text-slate-600">across all categories</p>
      </div>

      <div class="rounded-lg p-6 border bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-200">
        <p class="text-sm font-semibold uppercase text-slate-600">Latest Record</p>
        <p class="text-3xl font-bold mt-2 text-emerald-600">{{ latestValue }}</p>
        <p class="text-xs mt-1 text-slate-600">{{ formatDate(latestDate) }}</p>
      </div>

      <div class="rounded-lg p-6 border bg-gradient-to-br from-purple-100 to-purple-50 border-purple-200">
        <p class="text-sm font-semibold uppercase text-slate-600">Metric Types</p>
        <p class="text-3xl font-bold mt-2 text-purple-600">{{ metricTypes.length }}</p>
        <p class="text-xs mt-1 text-slate-600">being tracked</p>
      </div>

      <div class="rounded-lg p-6 border bg-gradient-to-br from-orange-100 to-orange-50 border-orange-200">
        <p class="text-sm font-semibold uppercase text-slate-600">Overall Trend</p>
        <p class="text-3xl font-bold mt-2" :class="getTrendColorClass()">
          {{ overallTrend }}
        </p>
        <p class="text-xs mt-1 text-slate-600">{{ trendIcon() }} {{ trendText() }}</p>
      </div>
    </div>

    <!-- Metric Categories Summary -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Power Metrics Summary -->
      <div class="rounded-lg shadow p-6 bg-white">
        <h3 class="text-lg font-semibold mb-4 text-slate-900">Power Metrics</h3>
        <div class="space-y-3">
          <MetricSummaryRow
            label="Fastball Velocity"
            :value="getMetricStats('velocity')"
            unit="mph"
          />
          <MetricSummaryRow
            label="Exit Velocity"
            :value="getMetricStats('exit_velo')"
            unit="mph"
          />
        </div>
      </div>

      <!-- Speed Metrics Summary -->
      <div class="rounded-lg shadow p-6 bg-white">
        <h3 class="text-lg font-semibold mb-4 text-slate-900">Speed Metrics</h3>
        <div class="space-y-3">
          <MetricSummaryRow
            label="60-Yard Dash"
            :value="getMetricStats('sixty_time')"
            unit="sec"
          />
          <MetricSummaryRow
            label="Pop Time"
            :value="getMetricStats('pop_time')"
            unit="sec"
          />
        </div>
      </div>

      <!-- Hitting Metrics Summary -->
      <div class="rounded-lg shadow p-6 bg-white">
        <h3 class="text-lg font-semibold mb-4 text-slate-900">Hitting Metrics</h3>
        <div class="space-y-3">
          <MetricSummaryRow
            label="Batting Average"
            :value="getMetricStats('batting_avg')"
            unit="avg"
          />
        </div>
      </div>

      <!-- Pitching Metrics Summary -->
      <div class="rounded-lg shadow p-6 bg-white">
        <h3 class="text-lg font-semibold mb-4 text-slate-900">Pitching Metrics</h3>
        <div class="space-y-3">
          <MetricSummaryRow
            label="ERA"
            :value="getMetricStats('era')"
            unit="era"
          />
          <MetricSummaryRow
            label="Strikeouts"
            :value="getMetricStats('strikeouts')"
            unit="k"
          />
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="rounded-lg shadow p-6 bg-white">
      <h3 class="text-lg font-semibold mb-4 text-slate-900">Recent Metrics</h3>
      <div v-if="recentMetrics.length > 0" class="space-y-2">
        <div
          v-for="metric in recentMetrics.slice(0, 5)"
          :key="metric.id"
          class="flex items-center justify-between py-2 px-3 rounded bg-slate-50"
        >
          <div>
            <p class="font-medium text-slate-900">{{ getMetricLabel(metric.metric_type) }}</p>
            <p class="text-xs text-slate-600">{{ formatDate(metric.recorded_date) }}</p>
          </div>
          <p class="text-lg font-semibold text-slate-900">
            {{ metric.value }} <span class="text-xs text-slate-600">{{ getUnit(metric.metric_type) }}</span>
          </p>
        </div>
      </div>
      <div v-else class="text-center py-6">
        <p class="text-slate-600">No metrics recorded yet</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePerformanceAnalytics } from '~/composables/usePerformanceAnalytics'
import type { Performance } from '~/types/models'
import MetricSummaryRow from './MetricSummaryRow.vue'

interface Props {
  metrics: any[]
}

const props = defineProps<Props>()
const analytics = usePerformanceAnalytics()

const latestValue = computed(() => {
  if (props.metrics.length === 0) return '—'
  const sorted = [...props.metrics].sort((a, b) =>
    new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime()
  )
  return sorted[0]?.value || '—'
})

const latestDate = computed(() => {
  if (props.metrics.length === 0) return new Date().toISOString()
  const sorted = [...props.metrics].sort((a, b) =>
    new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime()
  )
  return sorted[0]?.recorded_date || new Date().toISOString()
})

const metricTypes = computed(() => {
  const types = new Set(props.metrics.map(m => m.metric_type))
  return Array.from(types)
})

const overallTrend = computed(() => {
  if (props.metrics.length < 2) return '—'
  const trend = analytics.calculateTrend(props.metrics as Performance[], 'value')
  return trend.charAt(0).toUpperCase() + trend.slice(1)
})

const recentMetrics = computed(() => {
  return [...props.metrics].sort((a, b) =>
    new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime()
  )
})

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const getMetricStats = (type: string) => {
  const typeMetrics = props.metrics.filter(m => m.metric_type === type)
  if (typeMetrics.length === 0) return '—'

  const latest = typeMetrics[typeMetrics.length - 1]?.value || 0
  return latest.toFixed(1)
}

const getMetricLabel = (type: string): string => {
  const labels: Record<string, string> = {
    velocity: 'Fastball Velocity',
    exit_velo: 'Exit Velocity',
    sixty_time: '60-Yard Dash',
    pop_time: 'Pop Time',
    batting_avg: 'Batting Average',
    era: 'ERA',
    strikeouts: 'Strikeouts',
    other: 'Other Metric',
  }
  return labels[type] || type
}

const getUnit = (type: string): string => {
  const units: Record<string, string> = {
    velocity: 'mph',
    exit_velo: 'mph',
    sixty_time: 'sec',
    pop_time: 'sec',
    batting_avg: 'avg',
    era: 'era',
    strikeouts: 'k',
    other: 'val',
  }
  return units[type] || 'val'
}

const getTrendColorClass = (): string => {
  const trend = overallTrend.value.toLowerCase()
  if (trend.includes('improving')) return 'text-emerald-600'
  if (trend.includes('declining')) return 'text-red-600'
  return 'text-slate-900'
}

const trendIcon = () => {
  const trend = overallTrend.value.toLowerCase()
  if (trend.includes('improving')) return '📈'
  if (trend.includes('declining')) return '📉'
  return '➡️'
}

const trendText = () => {
  return overallTrend.value
}
</script>
