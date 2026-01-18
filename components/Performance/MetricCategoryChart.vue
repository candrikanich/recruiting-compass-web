<template>
  <div class="rounded-lg shadow p-6 bg-white">
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
      <h2 class="text-2xl font-bold text-slate-900">{{ title }}</h2>

      <!-- Metric Type Toggles -->
      <div class="flex flex-wrap gap-4">
        <label
          v-for="type in metricTypes"
          :key="type"
          class="flex items-center cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="visibleMetrics.includes(type)"
            @change="toggleMetric(type)"
            class="w-4 h-4 rounded accent-blue-600"
          />
          <span class="ml-2 text-sm font-medium text-slate-600">{{ getMetricLabel(type) }}</span>
        </label>
      </div>
    </div>

    <!-- Chart -->
    <div v-if="hasData" class="relative" style="height: 400px;">
      <Line :data="chartData" :options="chartOptions" />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <p class="text-slate-600">No metrics recorded in this category for the selected date range</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import type { PerformanceMetric, Event } from '~/types/models'

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Props {
  title: string
  metrics: PerformanceMetric[]
  events: Event[]
  metricTypes: string[]
  category: 'power' | 'speed' | 'hitting' | 'pitching'
}

const props = defineProps<Props>()

const visibleMetrics = ref<string[]>([...props.metricTypes])

const hasData = computed(() => props.metrics.length > 0)

const toggleMetric = (type: string) => {
  const index = visibleMetrics.value.indexOf(type)
  if (index > -1) {
    visibleMetrics.value.splice(index, 1)
  } else {
    visibleMetrics.value.push(type)
  }
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

const getMetricColor = (type: string): string => {
  const colors: Record<string, string> = {
    velocity: '#3b82f6',      // blue
    exit_velo: '#10b981',     // green
    sixty_time: '#f59e0b',    // amber
    pop_time: '#ef4444',      // red
    batting_avg: '#8b5cf6',   // purple
    era: '#ec4899',           // pink
    strikeouts: '#06b6d4',    // cyan
    other: '#6b7280',         // gray
  }
  return colors[type] || '#6b7280'
}

const getEventColor = (eventType: string): string => {
  const colors: Record<string, string> = {
    showcase: '#3b82f6',      // blue
    camp: '#10b981',          // green
    official_visit: '#8b5cf6', // purple
    unofficial_visit: '#f59e0b', // amber
    game: '#ef4444',          // red
  }
  return colors[eventType] || '#9ca3af' // gray default
}

// Prepare chart data
const chartData = computed(() => {
  const datasets = props.metricTypes
    .filter(type => visibleMetrics.value.includes(type))
    .map(type => {
      const metricsOfType = props.metrics
        .filter(m => m.metric_type === type)
        .sort((a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime())

      return {
        label: getMetricLabel(type),
        data: metricsOfType.map(m => ({
          x: new Date(m.recorded_date).getTime(),
          y: m.value
        })),
        borderColor: getMetricColor(type),
        backgroundColor: getMetricColor(type) + '20', // 20% opacity
        tension: 0.3,
        fill: false,
        pointRadius: 4,
        pointBackgroundColor: getMetricColor(type),
        pointBorderColor: '#fff',
        pointHoverRadius: 8
      }
    })

  return { datasets }
})

// Chart options
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  plugins: {
    tooltip: {
      callbacks: {
        title: (context: any) => {
          if (context.length === 0) return ''
          const date = new Date(context[0].label)
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        },
        afterLabel: (context: any) => {
          if (context.raw.eventId) {
            const event = props.events.find(e => e.id === context.raw.eventId)
            return event ? `📍 ${event.name}` : ''
          }
          return ''
        }
      }
    },
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        padding: 15,
        usePointStyle: true,
        font: {
          size: 12
        }
      }
    }
  },
  scales: {
    x: {
      type: 'time' as const,
      time: {
        unit: 'day' as const,
        displayFormats: {
          day: 'MMM d'
        }
      },
      title: {
        display: true,
        text: 'Date',
        font: {
          size: 12,
          weight: 'bold' as const
        }
      },
      grid: {
        display: true,
        color: '#f1f5f9'
      }
    },
    y: {
      title: {
        display: true,
        text: getYAxisLabel(),
        font: {
          size: 12,
          weight: 'bold' as const
        }
      },
      beginAtZero: false,
      grid: {
        color: '#f1f5f9'
      }
    }
  }
}))

const getYAxisLabel = (): string => {
  switch (props.category) {
    case 'power': return 'Velocity (mph)'
    case 'speed': return 'Time (seconds)'
    case 'hitting': return 'Batting Average'
    case 'pitching': return 'Value'
    default: return 'Value'
  }
}
</script>
