<template>
  <div class="rounded-lg p-6 bg-white shadow-md border-l-4" :class="getBorderColorClass">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-600">{{ label }}</p>
        <p class="text-3xl font-bold mt-2 text-slate-900">{{ formattedValue }}</p>
        <p v-if="subLabel" class="text-xs mt-1 text-slate-600">{{ subLabel }}</p>
      </div>

      <!-- Icon/Badge -->
      <div
        v-if="showIcon"
        class="w-12 h-12 rounded-full flex items-center justify-center"
        :class="getIconClass"
      >
        <span class="text-xl">{{ icon }}</span>
      </div>
    </div>

    <!-- Trend Indicator -->
    <div v-if="trend !== undefined" class="mt-4 pt-4 border-t border-slate-200">
      <div class="flex items-center gap-2">
        <span
          class="text-sm font-semibold"
          :class="getTrendClass"
        >
          {{ trend > 0 ? '↑' : trend < 0 ? '↓' : '→' }}
          {{ Math.abs(trend) }}%
        </span>
        <span class="text-xs text-slate-600">{{ trendLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  value: number | string
  unit?: string
  subLabel?: string
  trend?: number
  trendLabel?: string
  borderColor?: string
  icon?: string
  showIcon?: boolean
  format?: 'number' | 'percent' | 'currency' | 'decimal'
}

const props = withDefaults(defineProps<Props>(), {
  unit: '',
  borderColor: '#3b82f6',
  format: 'number',
  showIcon: false,
  icon: '📊'
})

const getBorderColorClass = computed(() => {
  switch (props.borderColor) {
    case '#10b981':
      return 'border-emerald-600'
    case '#f59e0b':
      return 'border-orange-600'
    case '#ef4444':
      return 'border-red-600'
    case '#8b5cf6':
      return 'border-purple-600'
    default:
      return 'border-blue-600'
  }
})

const getIconClass = computed(() => {
  switch (props.borderColor) {
    case '#10b981':
      return 'bg-emerald-100'
    case '#f59e0b':
      return 'bg-orange-100'
    case '#ef4444':
      return 'bg-red-100'
    case '#8b5cf6':
      return 'bg-purple-100'
    default:
      return 'bg-blue-100'
  }
})

const getTrendClass = computed(() => {
  if (props.trend! > 0) return 'text-emerald-600'
  if (props.trend! < 0) return 'text-red-600'
  return 'text-slate-600'
})

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value

  switch (props.format) {
    case 'percent':
      return `${Math.round(props.value * 100) / 100}%`
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(props.value)
    case 'decimal':
      return (Math.round(props.value * 100) / 100).toString()
    case 'number':
    default:
      return Math.round(props.value).toString()
  }
})
</script>
