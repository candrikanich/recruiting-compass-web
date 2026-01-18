<template>
  <NuxtLink
    :to="to"
    class="block bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition p-5"
  >
    <div class="flex items-start gap-4">
      <div
        class="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
        :class="getIconBgClass()"
      >
        <component v-if="iconComponent" :is="iconComponent" class="w-5 h-5" :class="getIconColorClass()" />
        <span v-else class="text-xl">{{ icon }}</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
          <span
            v-if="status"
            class="px-2 py-0.5 text-xs font-medium rounded-full"
            :class="getStatusClass()"
          >
            {{ status }}
          </span>
        </div>
        <p class="text-sm text-slate-500 mt-1">{{ description }}</p>
      </div>
      <div class="flex-shrink-0 text-slate-400">
        <ChevronRightIcon class="w-5 h-5" />
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  BellIcon,
  PencilSquareIcon,
  DevicePhoneMobileIcon,
  LinkIcon,
  KeyIcon,
  UserCircleIcon,
  CheckCircleIcon,
  HomeIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  to: string
  icon: string
  title: string
  description: string
  status?: 'complete' | 'incomplete' | 'new'
  variant?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray'
}>()

const getIconBgClass = (): string => {
  const classes: Record<string, string> = {
    blue: 'bg-blue-100',
    green: 'bg-emerald-100',
    purple: 'bg-purple-100',
    orange: 'bg-amber-100',
    red: 'bg-red-100',
    gray: 'bg-slate-100',
  }
  return classes[props.variant || 'blue']
}

const getIconColorClass = (): string => {
  const classes: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-emerald-600',
    purple: 'text-purple-600',
    orange: 'text-amber-600',
    red: 'text-red-600',
    gray: 'text-slate-600',
  }
  return classes[props.variant || 'blue']
}

const getStatusClass = (): string => {
  if (!props.status) return ''
  const classes: Record<string, string> = {
    complete: 'bg-emerald-100 text-emerald-700',
    incomplete: 'bg-amber-100 text-amber-700',
    new: 'bg-blue-100 text-blue-700',
  }
  return classes[props.status]
}

const iconComponent = computed(() => {
  const iconMap: Record<string, any> = {
    '🔔': BellIcon,
    '📝': PencilSquareIcon,
    '📱': DevicePhoneMobileIcon,
    '🔗': LinkIcon,
    '🔑': KeyIcon,
    '👤': UserCircleIcon,
    '✓': CheckCircleIcon,
    '🏠': HomeIcon,
    '⚙️': Cog6ToothIcon,
    '🎯': AdjustmentsHorizontalIcon,
    '🎛️': AdjustmentsHorizontalIcon,
  }
  return iconMap[props.icon] || null
})
</script>
