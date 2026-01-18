<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 class="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p class="text-gray-600 mt-1">Comprehensive recruiting metrics and performance insights</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Date Range Controls -->
      <DateRangeToolbar
        :date-range="dateRange"
        @update:dateRange="handleDateRangeChange"
      />

      <!-- Summary Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Schools"
          :value="stats.totalSchools"
          :trend="5"
          trend-label="vs last period"
          border-color="#3b82f6"
          icon="🏫"
          :show-icon="true"
        />
        <StatCard
          label="Total Interactions"
          :value="stats.totalInteractions"
          :trend="12"
          trend-label="vs last period"
          border-color="#10b981"
          icon="💬"
          :show-icon="true"
        />
        <StatCard
          label="Offer Count"
          :value="stats.totalOffers"
          :trend="-5"
          trend-label="vs last period"
          border-color="#f59e0b"
          icon="📝"
          :show-icon="true"
        />
        <StatCard
          label="Commitments"
          :value="stats.commitments"
          trend-label="locked in"
          border-color="#ef4444"
          icon="✅"
          :show-icon="true"
        />
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Interaction Type Distribution (Pie Chart) -->
        <div>
          <PieChart
            title="Interaction Types"
            :data="chartData.interactionTypes"
            chart-height="350px"
            :show-summary="true"
            @segment-click="handleInteractionTypeClick"
          />
        </div>

        <!-- Sentiment Breakdown (Pie Chart) -->
        <div>
          <PieChart
            title="Sentiment Breakdown"
            :data="chartData.sentiments"
            chart-height="350px"
            :show-summary="true"
          />
        </div>

        <!-- Recruiting Pipeline (Funnel Chart) -->
        <div>
          <FunnelChart
            title="Recruiting Pipeline"
            :stages="chartData.pipeline"
            @stage-click="handlePipelineStageClick"
          />
        </div>

        <!-- School Status Distribution (Pie Chart) -->
        <div>
          <PieChart
            title="School Status"
            :data="chartData.schoolStatus"
            chart-height="350px"
            :show-summary="true"
          />
        </div>
      </div>

      <!-- Performance Correlation (Scatter Chart) -->
      <div class="mb-8">
        <ScatterChart
          title="Performance Correlation Analysis"
          :datasets="chartData.performanceData"
          x-label="Exit Velocity (mph)"
          y-label="Distance (feet)"
          chart-height="400px"
          :show-stats="true"
          :show-trend-line="true"
        />
      </div>

      <!-- Export Actions -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <h3 class="text-lg font-semibold text-gray-900">Export Analytics</h3>
          <div class="flex gap-3">
            <button
              @click="handleExport('csv')"
              class="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Export as CSV
            </button>
            <button
              @click="handleExport('excel')"
              class="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Export as Excel
            </button>
            <button
              @click="handleExport('pdf')"
              class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Export as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DateRangeToolbar from '~/components/Analytics/DateRangeToolbar.vue'
import StatCard from '~/components/Analytics/StatCard.vue'
import PieChart from '~/components/Analytics/PieChart.vue'
import FunnelChart from '~/components/Analytics/FunnelChart.vue'
import ScatterChart from '~/components/Analytics/ScatterChart.vue'
import { usePerformanceAnalytics } from '~/composables/usePerformanceAnalytics'

interface DateRange {
  preset: string
  startDate: string
  endDate: string
}

const analytics = usePerformanceAnalytics()

const dateRange = ref<DateRange>({
  preset: 'last_30_days',
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0]
})

// Summary Statistics
const stats = ref({
  totalSchools: 24,
  totalInteractions: 87,
  totalOffers: 15,
  commitments: 3
})

// Chart Data
const chartData = ref({
  interactionTypes: [
    { label: 'Email', value: 34 },
    { label: 'Phone Call', value: 28 },
    { label: 'In-Person Visit', value: 15 },
    { label: 'Text', value: 10 }
  ],
  sentiments: [
    { label: 'Positive', value: 52 },
    { label: 'Neutral', value: 28 },
    { label: 'Needs Follow-up', value: 7 }
  ],
  schoolStatus: [
    { label: 'Active Recruiting', value: 18 },
    { label: 'On Wait List', value: 4 },
    { label: 'Passed', value: 2 }
  ],
  pipeline: [
    { label: 'Initial Contact', value: 250, color: '#3b82f6' },
    { label: 'Active Discussions', value: 85, color: '#10b981' },
    { label: 'Offers Extended', value: 15, color: '#f59e0b' },
    { label: 'Committed', value: 3, color: '#ef4444' }
  ],
  performanceData: [
    {
      label: 'Performance Metrics',
      data: [
        { x: 85, y: 340, label: 'Player A' },
        { x: 88, y: 355, label: 'Player B' },
        { x: 82, y: 325, label: 'Player C' },
        { x: 90, y: 365, label: 'Player D' },
        { x: 87, y: 350, label: 'Player E' },
        { x: 84, y: 335, label: 'Player F' },
        { x: 86, y: 345, label: 'Player G' },
        { x: 89, y: 360, label: 'Player H' }
      ],
      color: '#3b82f6'
    }
  ]
})

const handleDateRangeChange = (newRange: DateRange) => {
  dateRange.value = newRange
  // TODO: Fetch analytics data for new date range
}

const handleInteractionTypeClick = (label: string, value: number, index: number) => {
  console.log(`Clicked interaction type: ${label} (${value})`)
  // TODO: Navigate to detailed view or filter interactions
}

const handlePipelineStageClick = (label: string, value: number, index: number) => {
  console.log(`Clicked pipeline stage: ${label} (${value})`)
  // TODO: Show details or drill down into stage
}

const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
  console.log(`Exporting analytics as ${format}`)
  // TODO: Implement export functionality
}

onMounted(() => {
  // TODO: Fetch analytics data from API
})
</script>
