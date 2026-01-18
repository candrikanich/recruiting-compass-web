<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
          <span class="text-lg">📆</span>
        </div>
        <h2 class="text-slate-900 font-semibold">Recruiting Calendar</h2>
      </div>
      <div class="text-sm text-slate-600">
        Class of {{ graduationYear }}
      </div>
    </div>

    <!-- Current Period Highlight -->
    <div v-if="currentPeriod" class="rounded-xl p-4 mb-6 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-3 h-3 rounded-full animate-pulse bg-blue-500" />
        <span class="font-semibold text-blue-900">Current Period</span>
      </div>
      <p class="text-lg font-bold text-slate-900">{{ currentPeriod.name }}</p>
      <p class="text-sm mt-1 text-slate-700">{{ currentPeriod.description }}</p>
    </div>

    <!-- Next Key Dates -->
    <div class="space-y-3">
      <div
        v-for="date in upcomingDates"
        :key="date.id"
        :class="[
          'flex items-center justify-between p-3 rounded-xl border-2 transition-all',
          date.isUrgent
            ? 'bg-red-50 border-red-200 hover:border-red-300'
            : 'bg-white border-slate-200 hover:border-blue-300'
        ]"
      >
        <div class="flex items-center gap-3">
          <span class="text-xl">{{ date.emoji }}</span>
          <div>
            <p class="font-medium text-sm text-slate-900">{{ date.name }}</p>
            <p class="text-xs text-slate-600">{{ date.description }}</p>
          </div>
        </div>
        <div class="text-right">
          <p :class="['font-semibold text-sm', date.isUrgent ? 'text-red-600' : 'text-blue-600']">
            {{ date.countdown }}
          </p>
          <p class="text-xs text-slate-500">{{ formatDate(date.date) }}</p>
        </div>
      </div>
    </div>

    <!-- Division Rules Summary -->
    <div class="mt-6 pt-4 border-t border-slate-200">
      <details class="text-sm">
        <summary class="cursor-pointer font-medium text-slate-700 hover:text-slate-900 transition-colors">
          NCAA Division Rules Quick Reference
        </summary>
        <div class="mt-3 space-y-3 text-xs">
          <div class="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <p class="font-semibold text-blue-900">Division I</p>
            <p class="text-slate-700 mt-1">Coaches can contact you starting June 15 after sophomore year. Official visits allowed after August 1 before junior year.</p>
          </div>
          <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <p class="font-semibold text-emerald-900">Division II</p>
            <p class="text-slate-700 mt-1">Contact begins June 15 after sophomore year. More flexibility with unofficial visits.</p>
          </div>
          <div class="p-3 rounded-xl bg-purple-50 border border-purple-200">
            <p class="font-semibold text-purple-900">Division III</p>
            <p class="text-slate-700 mt-1">No recruiting calendar restrictions. Coaches can contact at any time.</p>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  graduationYear?: number
}

const props = withDefaults(defineProps<Props>(), {
  graduationYear: 2028,
})

interface RecruitingDate {
  id: string
  name: string
  description: string
  date: Date
  emoji: string
  countdown: string
  isUrgent: boolean
}

interface RecruitingPeriod {
  name: string
  description: string
  startDate: Date
  endDate: Date
}

const today = new Date()
today.setHours(0, 0, 0, 0)

// Calculate key dates based on graduation year
const getKeyDates = () => {
  const year = props.graduationYear

  // For a 2028 graduate:
  // Freshman year: 2024-2025
  // Sophomore year: 2025-2026 (June 15, 2026 = D1 contact opens)
  // Junior year: 2026-2027
  // Senior year: 2027-2028

  const dates = [
    {
      id: 'contact-opens',
      name: 'D1 Contact Period Opens',
      description: 'Coaches can initiate contact via email/text',
      date: new Date(year - 2, 5, 15), // June 15, sophomore year
      emoji: '📧',
    },
    {
      id: 'official-visits',
      name: 'Official Visits Allowed',
      description: 'Can take official visits to D1 schools',
      date: new Date(year - 2, 7, 1), // August 1, before junior year
      emoji: '✈️',
    },
    {
      id: 'junior-fall',
      name: 'Junior Fall Showcase Season',
      description: 'Peak recruiting exposure events',
      date: new Date(year - 2, 8, 1), // September, junior year
      emoji: '⚾',
    },
    {
      id: 'early-signing',
      name: 'Early Signing Period',
      description: 'NLI can be signed',
      date: new Date(year - 1, 10, 8), // November, senior year
      emoji: '✍️',
    },
    {
      id: 'regular-signing',
      name: 'Regular Signing Period',
      description: 'Spring signing window opens',
      date: new Date(year, 3, 15), // April, senior year
      emoji: '📝',
    },
    {
      id: 'graduation',
      name: 'High School Graduation',
      description: 'Class of ' + year,
      date: new Date(year, 4, 31), // May 31
      emoji: '🎓',
    },
  ]

  return dates.map(d => ({
    ...d,
    countdown: getCountdown(d.date),
    isUrgent: isWithin30Days(d.date),
  }))
}

const getCountdown = (date: Date): string => {
  const diff = date.getTime() - today.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return 'Passed'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 7) return `${days} days`
  if (days <= 30) return `${Math.ceil(days / 7)} weeks`
  if (days <= 365) return `${Math.floor(days / 30)} months`
  return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`
}

const isWithin30Days = (date: Date): boolean => {
  const diff = date.getTime() - today.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days >= 0 && days <= 30
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Get upcoming dates (filter out past dates, limit to 5)
const upcomingDates = computed<RecruitingDate[]>(() => {
  const allDates = getKeyDates()
  return allDates
    .filter(d => d.date >= today)
    .slice(0, 5)
})

// Determine current recruiting period
const currentPeriod = computed<RecruitingPeriod | null>(() => {
  const year = props.graduationYear

  const periods: RecruitingPeriod[] = [
    {
      name: 'Quiet Period',
      description: 'Focus on academics and skill development. Coaches can respond to your emails.',
      startDate: new Date(year - 4, 7, 1),
      endDate: new Date(year - 2, 5, 14),
    },
    {
      name: 'Contact Period',
      description: 'Coaches can initiate contact! Be proactive with outreach and responses.',
      startDate: new Date(year - 2, 5, 15),
      endDate: new Date(year - 1, 10, 7),
    },
    {
      name: 'Early Signing Period',
      description: 'National Letters of Intent can be signed. Make your decision!',
      startDate: new Date(year - 1, 10, 8),
      endDate: new Date(year - 1, 10, 15),
    },
    {
      name: 'Final Decision Period',
      description: 'Finalize your college choice before spring signing.',
      startDate: new Date(year - 1, 10, 16),
      endDate: new Date(year, 3, 14),
    },
  ]

  return periods.find(p => today >= p.startDate && today <= p.endDate) || null
})
</script>
