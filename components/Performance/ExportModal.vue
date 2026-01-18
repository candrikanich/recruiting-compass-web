<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white">
      <!-- Header -->
      <div class="sticky top-0 p-6 flex items-center justify-between bg-white border-b border-slate-300">
        <h2 class="text-2xl font-bold text-slate-900">Export Performance Report</h2>
        <button @click="$emit('close')" class="text-slate-600 hover:text-slate-900 transition">
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Report Type Selection -->
        <div>
          <label class="block text-sm font-medium mb-3 text-slate-600">Report Type</label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              v-for="type in reportTypes"
              :key="type.value"
              @click="selectedType = type.value"
              class="p-4 border-2 rounded-lg cursor-pointer transition"
              :class="selectedType === type.value ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-white'"
            >
              <div class="text-2xl mb-2">{{ type.icon }}</div>
              <div class="font-semibold text-slate-900">{{ type.label }}</div>
              <div class="text-xs mt-1 text-slate-600">{{ type.description }}</div>
            </div>
          </div>
        </div>

        <!-- Metric Type Selector (if Individual) -->
        <div v-if="selectedType === 'individual'">
          <label class="block text-sm font-medium mb-2 text-slate-600">Select Metric</label>
          <select v-model="selectedMetric" class="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:border-transparent">
            <option value="">Choose metric type...</option>
            <option v-for="type in availableMetricTypes" :key="type" :value="type">
              {{ getMetricLabel(type) }}
            </option>
          </select>
        </div>

        <!-- Format Selection -->
        <div>
          <label class="block text-sm font-medium mb-2 text-slate-600">Export Format</label>
          <div class="flex flex-wrap gap-4">
            <label class="flex items-center cursor-pointer">
              <input type="checkbox" v-model="formatPDF" class="w-4 h-4 rounded accent-blue-600" />
              <span class="ml-2 text-sm font-medium text-slate-600">PDF (Printable)</span>
            </label>
            <label class="flex items-center cursor-pointer">
              <input type="checkbox" v-model="formatText" class="w-4 h-4 rounded accent-blue-600" />
              <span class="ml-2 text-sm font-medium text-slate-600">Text Summary</span>
            </label>
          </div>
        </div>

        <!-- Coach Name (for text summary) -->
        <div v-if="formatText">
          <label class="block text-sm font-medium mb-2 text-slate-600">Coach Name (for email)</label>
          <input
            v-model="coachName"
            type="text"
            placeholder="e.g., Coach Smith"
            class="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:border-transparent"
          />
        </div>

        <!-- Date Range Filters -->
        <div>
          <label class="block text-sm font-medium mb-2 text-slate-600">Date Range</label>
          <select v-model="dateRange" class="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:border-transparent">
            <option value="all">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 180 Days</option>
          </select>
        </div>

        <!-- Verified Only -->
        <div class="flex items-center">
          <input type="checkbox" v-model="verifiedOnly" class="w-4 h-4 rounded accent-blue-600" />
          <label class="ml-2 text-sm font-medium text-slate-600">Verified Metrics Only</label>
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 p-6 flex gap-4 justify-end bg-slate-50 border-t border-slate-300">
        <button
          @click="$emit('close')"
          class="px-6 py-2 font-semibold rounded-lg transition bg-slate-200 text-slate-900 hover:bg-slate-300"
        >
          Cancel
        </button>
        <button
          @click="handleExport"
          :disabled="!canExport || isExporting"
          class="px-6 py-2 text-white font-semibold rounded-lg transition bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isExporting ? 'Generating...' : 'Export Report' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/solid'
import { useUserStore } from '~/stores/user'
import { generateIndividualMetricReport, generateComprehensiveReport, generateEventReport } from '~/utils/reportGenerators'
import { downloadFile, generateFilename, getMimeType } from '~/utils/exportHelpers'
import { getMetricLabel } from '~/utils/textTemplates'
import type { PerformanceMetric, Event } from '~/types/models'

const props = defineProps<{
  metrics: PerformanceMetric[]
  events?: Event[]
  context: 'dashboard' | 'event' | 'timeline'
  eventId?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const userStore = useUserStore()
const selectedType = ref('comprehensive')
const selectedMetric = ref('')
const formatPDF = ref(true)
const formatText = ref(false)
const coachName = ref('')
const dateRange = ref('all')
const verifiedOnly = ref(false)
const isExporting = ref(false)


const reportTypes = [
  { value: 'individual', icon: '📊', label: 'Individual Metric', description: 'Single metric with trend' },
  { value: 'comprehensive', icon: '📈', label: 'Complete Profile', description: 'All metrics summary' },
  { value: 'event', icon: '🎯', label: 'Event Report', description: 'Event-specific data' }
]

const availableMetricTypes = computed(() => {
  const types = new Set(props.metrics.map(m => m.metric_type))
  return Array.from(types)
})

const canExport = computed(() => {
  if (!formatPDF.value && !formatText.value) return false
  if (selectedType.value === 'individual' && !selectedMetric.value) return false
  if (selectedType.value === 'event' && !props.eventId) return false
  return true
})

const handleExport = async () => {
  isExporting.value = true

  try {
    const athleteName = userStore.currentUser?.full_name || 'Athlete'

    // Filter metrics based on selections
    let filteredMetrics = props.metrics
    if (verifiedOnly.value) filteredMetrics = filteredMetrics.filter(m => m.verified)
    if (dateRange.value !== 'all') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - parseInt(dateRange.value))
      filteredMetrics = filteredMetrics.filter(m => new Date(m.recorded_date) >= cutoff)
    }

    // Generate reports based on selected formats
    const formats = []
    if (formatPDF.value) formats.push('pdf')
    if (formatText.value) formats.push('text')

    for (const format of formats) {
      let report

      if (selectedType.value === 'individual') {
        report = generateIndividualMetricReport(selectedMetric.value, {
          metrics: filteredMetrics,
          format: format as 'pdf' | 'text',
          athleteName,
          coachName: coachName.value
        })
      } else if (selectedType.value === 'comprehensive') {
        report = generateComprehensiveReport({
          metrics: filteredMetrics,
          format: format as 'pdf' | 'text',
          athleteName,
          coachName: coachName.value
        })
      } else if (selectedType.value === 'event') {
        const event = props.events?.find(e => e.id === props.eventId)
        if (!event) continue

        const eventMetrics = filteredMetrics.filter(m => m.event_id === props.eventId)
        report = generateEventReport({
          metrics: eventMetrics,
          format: format as 'pdf' | 'text',
          athleteName,
          event
        })
      }

      if (report) {
        const filename = generateFilename(selectedType.value, format === 'pdf' ? 'pdf' : 'txt')
        const mimeType = getMimeType(format === 'pdf' ? 'pdf' : 'text')
        downloadFile(report, filename, mimeType)
      }
    }

    emit('close')
  } catch (error) {
    console.error('Export failed:', error)
    alert('Failed to generate report. Please try again.')
  } finally {
    isExporting.value = false
  }
}
</script>
