<template>
  <div class="rounded-lg p-6 bg-white shadow-md">
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
      <div>
        <h3 class="text-lg font-bold text-slate-900">{{ title }}</h3>
        <p class="text-sm mt-1 text-slate-600">{{ dataPoints }} data points</p>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-3">
        <label class="flex items-center cursor-pointer">
          <input
            type="checkbox"
            v-model="showTrendLine"
            class="w-4 h-4 rounded accent-blue-600"
          />
          <span class="ml-2 text-sm font-medium text-slate-900">Trend Line</span>
        </label>
        <label class="flex items-center cursor-pointer">
          <input
            type="checkbox"
            v-model="showQuadrants"
            class="w-4 h-4 rounded accent-blue-600"
          />
          <span class="ml-2 text-sm font-medium text-slate-900">Quadrants</span>
        </label>
      </div>
    </div>

    <!-- Chart -->
    <div v-if="hasData" class="relative" :style="{ height: chartHeight }">
      <Scatter :data="chartData" :options="chartOptions" />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 text-slate-600">
      <p>{{ emptyStateMessage }}</p>
    </div>

     <!-- Statistics (Optional) -->
    <div v-if="hasData && showStats" data-testid="stats-section" class="mt-6 pt-6 border-t border-slate-200">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center p-3 bg-slate-50 rounded-lg">
          <p class="text-sm font-medium text-slate-600">Correlation</p>
          <p class="text-lg font-bold text-slate-900">{{ correlation }}</p>
        </div>
        <div class="text-center p-3 bg-slate-50 rounded-lg">
           <p class="text-sm font-medium text-slate-600">{{ xLabel }} Range</p>
           <p class="text-lg font-bold text-slate-900">{{ xRange.min }}-{{ xRange.max }}</p>
        </div>
        <div class="text-center p-3 bg-slate-50 rounded-lg">
           <p class="text-sm font-medium text-slate-600">{{ yLabel }} Range</p>
           <p class="text-lg font-bold text-slate-900">{{ yRange.min }}-{{ yRange.max }}</p>
        </div>
        <div class="text-center p-3 bg-slate-50 rounded-lg">
          <p class="text-sm font-medium text-slate-600">Trend</p>
          <p class="text-lg font-bold" :class="trendClass">{{ trendDirection }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Scatter } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartDataset
} from 'chart.js'
import { usePerformanceAnalytics } from '~/composables/usePerformanceAnalytics'

ChartJS.register(LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface DataPoint {
  x: number
  y: number
  label?: string
}

interface Dataset {
  label: string
  data: DataPoint[]
  color?: string
}

// Use Chart.js ChartDataset type directly

interface Props {
  title: string
  datasets: Dataset[]
  xLabel: string
  yLabel: string
  chartHeight?: string
  showStats?: boolean
  showTrendLine?: boolean
  showQuadrants?: boolean
  emptyStateMessage?: string
  bubbleSize?: boolean
  colors?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  chartHeight: '350px',
  showStats: true,
  showTrendLine: false,
  showQuadrants: false,
  emptyStateMessage: 'No data available',
  bubbleSize: false,
  colors: () => ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
})

const showTrendLine = ref(props.showTrendLine)
const showQuadrants = ref(props.showQuadrants)
const _analytics = usePerformanceAnalytics()

const hasData = computed(() => props.datasets.some(ds => ds.data.length > 0))

const dataPoints = computed(() => {
  return props.datasets.reduce((sum, ds) => sum + ds.data.length, 0)
})

// Flatten all data points for calculations
const allDataPoints = computed(() => {
  return props.datasets.flatMap(ds => ds.data)
})

// Calculate correlation coefficient
const correlation = computed(() => {
  if (allDataPoints.value.length < 2) return 'N/A'

  const xValues = allDataPoints.value.map(p => p.x)
  const yValues = allDataPoints.value.map(p => p.y)

  // Pearson correlation coefficient
  const n = xValues.length
  const sumX = xValues.reduce((a, b) => a + b, 0)
  const sumY = yValues.reduce((a, b) => a + b, 0)
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)
  const sumY2 = yValues.reduce((sum, y) => sum + y * y, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 'N/A'
  return Math.round((numerator / denominator) * 100) / 100
})

// Calculate ranges
const xRange = computed(() => {
  if (allDataPoints.value.length === 0) return { min: 0, max: 0 }
  const values = allDataPoints.value.map(p => p.x)
  const min = Math.min(...values)
  const max = Math.max(...values)
  return { min: Math.round(min), max: Math.round(max) }
})

const yRange = computed(() => {
  if (allDataPoints.value.length === 0) return { min: 0, max: 0 }
  const values = allDataPoints.value.map(p => p.y)
  const min = Math.min(...values)
  const max = Math.max(...values)
  return { min: Math.round(min), max: Math.round(max) }
})

// Calculate trend direction
const trendDirection = computed(() => {
  if (allDataPoints.value.length < 2) return 'N/A'

  const xValues = allDataPoints.value.map(p => p.x)
  const yValues = allDataPoints.value.map(p => p.y)

  // Simple linear regression slope
  const n = xValues.length
  const sumX = xValues.reduce((a, b) => a + b, 0)
  const sumY = yValues.reduce((a, b) => a + b, 0)
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  if (Math.abs(slope) < 0.01) return 'Flat'
  return slope > 0 ? 'Positive' : 'Negative'
})

const trendClass = computed(() => {
  if (trendDirection.value === 'Positive') return 'text-green-600'
  if (trendDirection.value === 'Negative') return 'text-red-600'
  return 'text-gray-600'
})

// Calculate trend line points if enabled
const trendLineData = computed(() => {
  if (!showTrendLine.value || allDataPoints.value.length < 2) return null

  const xValues = allDataPoints.value.map(p => p.x)
  const yValues = allDataPoints.value.map(p => p.y)

  const n = xValues.length
  const sumX = xValues.reduce((a, b) => a + b, 0)
  const sumY = yValues.reduce((a, b) => a + b, 0)
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)

  return [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ]
})

// Prepare chart data
const chartData = computed((): ChartData<'scatter', DataPoint[]> => {
  const chartDatasets: ChartDataset<'scatter', DataPoint[]>[] = props.datasets.map((ds, index) => ({
    label: ds.label,
    data: ds.data,
    backgroundColor: ds.color || props.colors[index % props.colors.length],
    borderColor: ds.color || props.colors[index % props.colors.length],
    borderWidth: 2,
    radius: 5,
    hoverRadius: 7
  }))

  // Add trend line if enabled
  if (showTrendLine.value && trendLineData.value) {
    const trendLineDataset: ChartDataset<'scatter', DataPoint[]> = {
      label: 'Trend Line',
      data: trendLineData.value,
      borderColor: '#6b7280',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      tension: 0
    }
    chartDatasets.push(trendLineDataset)
  }

  return { datasets: chartDatasets }
})

// Calculate quadrant lines (medians)
const _quadrantLines = computed(() => {
  if (!showQuadrants.value || allDataPoints.value.length === 0) return { x: 0, y: 0 }

  const xValues = [...allDataPoints.value.map(p => p.x)].sort((a, b) => a - b)
  const yValues = [...allDataPoints.value.map(p => p.y)].sort((a, b) => a - b)

  const xMedian = xValues[Math.floor(xValues.length / 2)]
  const yMedian = yValues[Math.floor(yValues.length / 2)]

  return { x: xMedian, y: yMedian }
})

// Chart options
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'nearest' as const,
    intersect: false
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 15,
        usePointStyle: true,
        font: { size: 12 },
        color: '#6b7280'
      }
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const point = context.raw
          if (!point.x && point.x !== 0) return context.dataset.label
          const label = `${props.xLabel}: ${point.x?.toFixed(2) || 'N/A'}, ${props.yLabel}: ${point.y?.toFixed(2) || 'N/A'}`
          return point.label ? `${point.label} - ${label}` : label
        }
      }
    }
  },
  scales: {
    x: {
      type: 'linear' as const,
      position: 'bottom' as const,
      title: {
        display: true,
        text: props.xLabel,
        font: { size: 12, weight: 'bold' as const }
      },
      grid: {
        display: true,
        color: '#f3f4f6'
      }
    },
    y: {
      title: {
        display: true,
        text: props.yLabel,
        font: { size: 12, weight: 'bold' as const }
      },
      grid: {
        color: '#f3f4f6'
      }
    }
  }
}))

// Expose computed properties for testing
defineExpose({
  chartData,
  chartOptions,
  correlation,
  xRange,
  yRange,
  _analytics,
  _quadrantLines
})
</script>
