<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <h2 class="text-xl font-bold mb-6 text-slate-900">📊 Recent Performance</h2>

    <!-- Empty State -->
    <div v-if="latestMetricsByType.length === 0" class="text-center py-8 text-slate-600">
      <p>No performance metrics recorded yet</p>
      <NuxtLink to="/performance" class="text-sm mt-2 inline-block text-blue-600 hover:text-blue-700">
        Log your first metric →
      </NuxtLink>
    </div>

    <!-- Performance Metrics Grid -->
    <div v-else class="space-y-4">
      <!-- Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          v-for="metric in latestMetricsByType"
          :key="metric.metric_type"
          class="rounded-lg p-3 bg-slate-50"
        >
          <div class="flex items-start justify-between mb-2">
            <span class="text-2xl">{{ getMetricEmoji(metric.metric_type) }}</span>
            <span
              v-if="getTrend(metric.metric_type)"
              class="text-xs font-bold px-1.5 py-0.5 rounded"
              :class="{
                'bg-emerald-100 text-emerald-700': getTrendDirection(metric.metric_type) === 'up',
                'bg-red-100 text-red-700': getTrendDirection(metric.metric_type) === 'down'
              }"
            >
              {{ getTrendDirection(metric.metric_type) === 'up' ? '↑' : '↓' }}
            </span>
          </div>
          <p class="text-sm font-semibold text-slate-900">
            {{ metric.value }} <span class="text-xs font-normal text-slate-600">{{ metric.unit }}</span>
          </p>
          <p class="text-xs mt-1 text-slate-600">{{ getMetricLabel(metric.metric_type) }}</p>
          <p class="text-xs mt-0.5 text-slate-600">{{ formatDate(metric.recorded_date) }}</p>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="border-t border-slate-200 pt-4">
        <h3 class="text-sm font-semibold mb-3 text-slate-900">Last 3 Entries</h3>
        <div class="space-y-2">
          <div
            v-for="metric in recentMetrics.slice(0, 3)"
            :key="metric.id"
            class="flex items-center justify-between p-2 rounded transition bg-slate-50 hover:bg-slate-100"
          >
            <div class="flex-1">
              <p class="text-sm font-medium text-slate-900">
                {{ getMetricLabel(metric.metric_type) }}
              </p>
              <p class="text-xs text-slate-600">{{ formatDate(metric.recorded_date) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-slate-900">{{ metric.value }}</p>
              <p class="text-xs text-slate-600">{{ metric.unit }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- View All Link -->
      <div class="text-center pt-2">
        <NuxtLink to="/performance" class="text-sm font-medium text-blue-600 hover:text-blue-700">
          View all metrics →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PerformanceMetric } from '~/types/models'

interface Props {
  metrics: PerformanceMetric[]
}

const props = defineProps<Props>()

// Get latest metric for each type
const latestMetricsByType = computed(() => {
  const typeMap = new Map<string, PerformanceMetric>()

  // Sort by date descending to get latest first
  const sorted = [...props.metrics].sort((a, b) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime())

  for (const metric of sorted) {
    if (!typeMap.has(metric.metric_type)) {
      typeMap.set(metric.metric_type, metric)
    }
  }

  return Array.from(typeMap.values())
})

// Get recent metrics (last 10)
const recentMetrics = computed(() => {
  return [...props.metrics].sort((a, b) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime()).slice(0, 10)
})

// Calculate trend (compare to previous value of same type)
const getTrend = (metricType: string) => {
  const sameType = props.metrics.filter((m) => m.metric_type === metricType).sort((a, b) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime())

  if (sameType.length < 2) return null

  const latest = sameType[0].value
  const previous = sameType[1].value

  return latest - previous
}

const getTrendDirection = (metricType: string) => {
  const trend = getTrend(metricType)
  if (trend === null) return null
  return trend > 0 ? 'up' : 'down'
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const getMetricEmoji = (type: string) => {
  const emojiMap: Record<string, string> = {
    velocity: '⚡',
    exit_velo: '💥',
    sixty_time: '🏃',
    pop_time: '🎯',
    batting_avg: '🏏',
    era: '🎪',
    strikeouts: '⚾',
    other: '📈',
  }
  return emojiMap[type] || '📊'
}

const getMetricLabel = (type: string) => {
  const labels: Record<string, string> = {
    velocity: 'Fastball Velocity',
    exit_velo: 'Exit Velocity',
    sixty_time: '60-Yard Dash',
    pop_time: 'Pop Time',
    batting_avg: 'Batting Avg',
    era: 'ERA',
    strikeouts: 'Strikeouts',
    other: 'Other',
  }
  return labels[type] || type
}
</script>
