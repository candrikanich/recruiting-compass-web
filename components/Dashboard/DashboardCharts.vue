<template>
  <div class="lg:col-span-2 space-y-6">
    <!-- Schools by Size -->
    <div v-if="showSchoolsMetric && schoolCount > 0" class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
      <div class="flex items-center gap-3 mb-5">
        <div class="p-2 bg-slate-100 rounded-lg">
          <BuildingLibraryIcon class="w-5 h-5 text-slate-700" />
        </div>
        <h3 class="text-slate-900 font-semibold">Schools by Size</h3>
      </div>
      <div class="space-y-3">
        <div v-for="size in ['Very Small', 'Small', 'Medium', 'Large', 'Very Large']" :key="size">
          <div v-if="schoolSizeBreakdown[size] > 0">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-slate-700">{{ size }}</span>
              <span class="text-slate-900 font-medium">{{ schoolSizeBreakdown[size] }}</span>
            </div>
            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                :class="getSizeBarColor(size)"
                class="h-full transition-all duration-500"
                :style="{ width: `${(schoolSizeBreakdown[size] / schoolCount) * 100}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions (Athlete Only) -->
    <div v-if="!isViewingAsParent && showQuickActions" class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
      <div class="flex items-center gap-3 mb-5">
        <div class="p-2 bg-slate-100 rounded-lg">
          <BoltIcon class="w-5 h-5 text-slate-700" />
        </div>
        <h3 class="text-slate-900 font-semibold">Quick Actions</h3>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <NuxtLink
          to="/coaches/new"
          class="bg-brand-blue-500 hover:bg-brand-blue-600 text-white p-4 rounded-lg transition-all hover:scale-105 hover:shadow-lg text-left group"
        >
          <UserPlusIcon class="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
          <div class="font-medium mb-1">Add Coach</div>
          <div class="text-white/80 text-sm">Connect with a new coach</div>
        </NuxtLink>
        <NuxtLink
          to="/interactions/new"
          class="bg-brand-emerald-500 hover:bg-brand-emerald-600 text-white p-4 rounded-lg transition-all hover:scale-105 hover:shadow-lg text-left group"
        >
          <ChatBubbleLeftRightIcon class="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
          <div class="font-medium mb-1">Log Interaction</div>
          <div class="text-white/80 text-sm">Record a conversation</div>
        </NuxtLink>
        <NuxtLink
          to="/schools/new"
          class="bg-brand-purple-500 hover:bg-brand-purple-600 text-white p-4 rounded-lg transition-all hover:scale-105 hover:shadow-lg text-left group"
        >
          <BuildingLibraryIcon class="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
          <div class="font-medium mb-1">Add School</div>
          <div class="text-white/80 text-sm">Research a new school</div>
        </NuxtLink>
        <NuxtLink
          to="/events/new"
          class="bg-brand-orange-500 hover:bg-brand-orange-600 text-white p-4 rounded-lg transition-all hover:scale-105 hover:shadow-lg text-left group"
        >
          <CalendarDaysIcon class="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
          <div class="font-medium mb-1">Schedule Event</div>
          <div class="text-white/80 text-sm">Register for a camp</div>
        </NuxtLink>
      </div>
    </div>

    <!-- Parent Guidance Card -->
    <ParentGuidanceCard v-if="isViewingAsParent" :athlete-id="athleteId" />

    <!-- Performance Metrics -->
    <div v-if="showPerformance && metrics.length > 0" class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
      <div class="flex items-center gap-3 mb-5">
        <div class="p-2 bg-slate-100 rounded-lg">
          <ChartBarIcon class="w-5 h-5 text-slate-700" />
        </div>
        <h3 class="text-slate-900 font-semibold">Performance Metrics</h3>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div v-for="metric in topMetrics" :key="metric.id" class="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div class="text-slate-600 text-sm mb-1">{{ metric.metric_type }}</div>
          <div class="text-xl font-bold" :class="getMetricColor(metric.metric_type)">
            {{ metric.value }}
            <span v-if="metric.unit" class="text-slate-500 text-sm ml-1">{{ metric.unit }}</span>
          </div>
        </div>
      </div>
      <NuxtLink
        to="/performance"
        class="mt-4 block w-full py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 text-center"
      >
        View All Metrics
      </NuxtLink>
    </div>

    <!-- Recruiting Calendar -->
    <RecruitingCalendar v-if="showCalendar" :graduation-year="graduationYear" />

    <!-- Charts -->
    <div v-if="showCharts" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <InteractionTrendChart :interactions="interactions" />
      <SchoolInterestChart :schools="schools" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BuildingLibraryIcon,
  BoltIcon,
  UserPlusIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ChartBarIcon,
} from '@heroicons/vue/24/outline'

interface Metric {
  id: string
  metric_type: string
  value: number
  unit?: string
  [key: string]: any
}

interface Props {
  schoolCount: number
  schoolSizeBreakdown: Record<string, number>
  metrics: Metric[]
  topMetrics?: Metric[]
  interactions: any[]
  schools: any[]
  graduationYear: number
  athleteId: string
  isViewingAsParent?: boolean
  showSchoolsMetric?: boolean
  showQuickActions?: boolean
  showPerformance?: boolean
  showCalendar?: boolean
  showCharts?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  topMetrics: () => [],
  isViewingAsParent: false,
  showSchoolsMetric: true,
  showQuickActions: true,
  showPerformance: true,
  showCalendar: true,
  showCharts: true,
})

const getSizeBarColor = (size: string): string => {
  const colors: Record<string, string> = {
    'Very Small': 'bg-blue-500',
    'Small': 'bg-blue-400',
    'Medium': 'bg-blue-300',
    'Large': 'bg-orange-400',
    'Very Large': 'bg-orange-500',
  }
  return colors[size] || 'bg-slate-300'
}

const getMetricColor = (type: string): string => {
  const colors: Record<string, string> = {
    'height': 'text-blue-600',
    'weight': 'text-emerald-600',
    'velocity': 'text-orange-600',
    'exit_velo': 'text-purple-600',
  }
  return colors[type.toLowerCase()] || 'text-slate-600'
}
</script>
