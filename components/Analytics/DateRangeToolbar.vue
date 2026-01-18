<template>
  <div class="rounded-lg p-6 mb-6 bg-white shadow-md">
    <div class="flex flex-col md:flex-row gap-4 items-end">
      <!-- Date Range Preset -->
      <div class="flex-1">
        <label class="block text-sm font-medium mb-2 text-slate-900">Date Range</label>
        <select
          :value="dateRange.preset"
          @change="handlePresetChange"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent"
        >
          <option value="last_7_days">Last 7 Days</option>
          <option value="last_30_days">Last 30 Days</option>
          <option value="last_90_days">Last 90 Days</option>
          <option value="last_6_months">Last 6 Months</option>
          <option value="last_12_months">Last 12 Months</option>
          <option value="all_time">All Time</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      <!-- Custom Start Date -->
      <div v-if="dateRange.preset === 'custom'" class="flex-1">
        <label class="block text-sm font-medium mb-2 text-slate-900">Start Date</label>
        <input
          type="date"
          :value="dateRange.startDate"
          @input="handleStartDateChange"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent"
        />
      </div>

      <!-- Custom End Date -->
      <div v-if="dateRange.preset === 'custom'" class="flex-1">
        <label class="block text-sm font-medium mb-2 text-slate-900">End Date</label>
        <input
          type="date"
          :value="dateRange.endDate"
          @input="handleEndDateChange"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:border-transparent"
        />
      </div>

      <!-- Clear Filters Button -->
      <button
        @click="handleClear"
        class="px-4 py-2 border border-slate-300 font-medium rounded-lg transition text-slate-900 hover:bg-slate-50"
      >
        Clear
      </button>

      <!-- Apply Button (shows when custom) -->
      <button
        v-if="dateRange.preset === 'custom'"
        @click="handleApply"
        class="px-4 py-2 text-white font-medium rounded-lg transition bg-blue-600 hover:bg-blue-700"
      >
        Apply
      </button>
    </div>

    <!-- Date Range Display -->
    <div class="mt-4 text-sm text-slate-600">
      <p>
        Showing data from
        <span class="font-semibold text-slate-900">{{ formatDateDisplay(displayStartDate) }}</span>
        to
        <span class="font-semibold text-slate-900">{{ formatDateDisplay(displayEndDate) }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface DateRange {
  preset: string
  startDate: string
  endDate: string
}

interface Props {
  dateRange: DateRange
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:dateRange': [value: DateRange]
}>()

const handlePresetChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  const newDateRange = calculateDateRange(target.value)
  emit('update:dateRange', {
    preset: target.value,
    startDate: newDateRange.startDate,
    endDate: newDateRange.endDate
  })
}

const handleStartDateChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:dateRange', { ...props.dateRange, startDate: target.value })
}

const handleEndDateChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:dateRange', { ...props.dateRange, endDate: target.value })
}

const handleClear = () => {
  const today = new Date().toISOString().split('T')[0]
  emit('update:dateRange', {
    preset: 'last_30_days',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: today
  })
}

const handleApply = () => {
  // Date is already updated via input events
  // This button just provides visual confirmation
}

const calculateDateRange = (preset: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = today.toISOString().split('T')[0]

  let startDate = endDate
  switch (preset) {
    case 'last_7_days':
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'last_30_days':
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'last_90_days':
      startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'last_6_months':
      startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'last_12_months':
      startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'all_time':
      startDate = '2020-01-01'
      break
  }

  return { startDate, endDate }
}

const displayStartDate = computed(() => {
  return props.dateRange.startDate || new Date().toISOString().split('T')[0]
})

const displayEndDate = computed(() => {
  return props.dateRange.endDate || new Date().toISOString().split('T')[0]
})

const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
