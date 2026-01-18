<template>
  <div class="rounded-lg p-6 mb-8 bg-white shadow-md">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Date Range Preset -->
      <div>
        <label class="block text-sm font-medium mb-2 text-slate-900">Date Range</label>
        <select
          :value="dateRange.preset"
          @change="handlePresetChange"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:border-transparent"
        >
          <option value="last_30_days">Last 30 Days</option>
          <option value="last_3_months">Last 3 Months</option>
          <option value="last_6_months">Last 6 Months</option>
          <option value="last_12_months">Last 12 Months</option>
          <option value="all_time">All Time</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      <!-- Custom Start Date (show if preset=custom) -->
      <div v-if="dateRange.preset === 'custom'">
        <label class="block text-sm font-medium mb-2 text-slate-900">Start Date</label>
        <input
          type="date"
          :value="dateRange.startDate"
          @input="handleStartDateChange"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:border-transparent"
        />
      </div>

      <!-- Custom End Date (show if preset=custom) -->
      <div v-if="dateRange.preset === 'custom'">
        <label class="block text-sm font-medium mb-2 text-slate-900">End Date</label>
        <input
          type="date"
          :value="dateRange.endDate"
          @input="handleEndDateChange"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:border-transparent"
        />
      </div>

      <!-- Verified Only -->
      <div class="flex items-end">
        <label class="flex items-center cursor-pointer">
          <input
            type="checkbox"
            :checked="verifiedOnly"
            @change="handleVerifiedChange"
            class="w-4 h-4 rounded accent-blue-600"
          />
          <span class="ml-2 text-sm font-medium text-slate-900">Verified Only</span>
        </label>
      </div>

      <!-- Export Dropdown -->
      <div class="flex items-end gap-2">
        <div class="flex-1 relative">
          <button
            @click="showExportMenu = !showExportMenu"
            class="w-full px-4 py-2 font-semibold rounded-lg transition bg-slate-50 text-slate-900 hover:bg-slate-100"
          >
            Export ▼
          </button>

          <!-- Export Menu -->
          <div
            v-if="showExportMenu"
            class="absolute bottom-full right-0 mb-2 w-48 rounded-lg z-10 bg-white border border-slate-300 shadow-lg"
          >
            <button
              @click="handleExport('csv')"
              class="block w-full text-left px-4 py-2 rounded-t-lg text-sm text-slate-900 hover:bg-slate-50"
            >
              Export as CSV
            </button>
            <button
              @click="handleExport('json')"
              class="block w-full text-left px-4 py-2 rounded-b-lg text-sm text-slate-900 hover:bg-slate-50"
            >
              Export as JSON
            </button>
          </div>
        </div>
        <button
          @click="handleAdvancedExport"
          class="px-4 py-2 text-white font-semibold rounded-lg transition bg-blue-600 hover:bg-blue-700"
        >
          Advanced
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface DateRange {
  preset: string
  startDate: string
  endDate: string
}

const props = defineProps<{
  dateRange: DateRange
  verifiedOnly: boolean
}>()

const emit = defineEmits<{
  'update:dateRange': [value: DateRange]
  'update:verifiedOnly': [value: boolean]
  'export': [format: 'csv' | 'json']
  'advanced-export': []
}>()

const showExportMenu = ref(false)

const handlePresetChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  emit('update:dateRange', { ...props.dateRange, preset: target.value })
}

const handleStartDateChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:dateRange', { ...props.dateRange, startDate: target.value })
}

const handleEndDateChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:dateRange', { ...props.dateRange, endDate: target.value })
}

const handleVerifiedChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:verifiedOnly', target.checked)
}

const handleExport = (format: 'csv' | 'json') => {
  emit('export', format)
  showExportMenu.value = false
}

const handleAdvancedExport = () => {
  emit('advanced-export')
  showExportMenu.value = false
}
</script>
