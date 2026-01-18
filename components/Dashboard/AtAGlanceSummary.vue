<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <h2 class="text-xl font-bold mb-6 text-slate-900">👁️ At a Glance</h2>

    <!-- Summary Metrics Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Schools with Offers -->
      <div class="rounded-lg p-4 bg-gradient-to-br from-emerald-50 to-white">
        <div class="flex items-start justify-between mb-2">
          <span class="text-2xl">🎯</span>
          <span class="text-xs font-bold text-emerald-700">{{ offersPercentage }}%</span>
        </div>
        <p class="text-sm font-semibold text-slate-900">Schools with Offers</p>
        <p class="text-xs mt-1 text-slate-600">{{ acceptedOffers }} of {{ totalSchools }}</p>
      </div>

      <!-- Coach Responsiveness -->
      <div class="rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white">
        <div class="flex items-start justify-between mb-2">
          <span class="text-2xl">💬</span>
          <span
            class="text-xs font-bold px-2 py-1 rounded"
            :class="[
              avgResponsiveness >= 75
                ? 'bg-emerald-100 text-emerald-700'
                : avgResponsiveness >= 50
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-red-100 text-red-700',
            ]"
          >
            {{ avgResponsiveness }}%
          </span>
        </div>
        <p class="text-sm font-semibold text-slate-900">Avg Coach Responsiveness</p>
        <p class="text-xs mt-1 text-slate-600">{{ coachCount }} coaches tracked</p>
      </div>

      <!-- Interactions This Month -->
      <div class="rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white">
        <div class="flex items-start justify-between mb-2">
          <span class="text-2xl">📧</span>
          <span class="text-xs font-bold text-purple-700">{{ interactionsThisMonth }}</span>
        </div>
        <p class="text-sm font-semibold text-slate-900">Interactions This Month</p>
        <p class="text-xs mt-1 text-slate-600">
          {{ monthName }} {{ currentYear }}
        </p>
      </div>

      <!-- Days Until Graduation -->
      <div class="rounded-lg p-4 bg-gradient-to-br from-orange-50 to-white">
        <div class="flex items-start justify-between mb-2">
          <span class="text-2xl">🎓</span>
          <span class="text-xs font-bold text-orange-700">{{ daysUntilGraduation }}d</span>
        </div>
        <p class="text-sm font-semibold text-slate-900">Days Until Graduation</p>
        <p class="text-xs mt-1 text-slate-600">May 31, 2028</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Coach, School, Interaction, Offer } from '~/types/models'

interface Props {
  coaches: Coach[]
  schools: School[]
  interactions: Interaction[]
  offers: Offer[]
}

const props = defineProps<Props>()

// Schools with offers
const totalSchools = computed(() => props.schools.length)
const acceptedOffers = computed(() => props.offers.filter((o) => o.status === 'accepted').length)
const offersPercentage = computed(() => {
  if (totalSchools.value === 0) return 0
  return Math.round((acceptedOffers.value / totalSchools.value) * 100)
})

// Coach responsiveness
const coachCount = computed(() => props.coaches.length)
const avgResponsiveness = computed(() => {
  if (coachCount.value === 0) return 0
  const total = props.coaches.reduce((sum, coach) => sum + (coach.responsiveness_score || 0), 0)
  return Math.round(total / coachCount.value)
})

// Interactions this month
const currentDate = new Date()
const currentMonth = currentDate.getMonth()
const currentYear = currentDate.getFullYear()
const monthName = computed(() => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return months[currentMonth]
})

const interactionsThisMonth = computed(() => {
  return props.interactions.filter((interaction) => {
    const interactionDate = new Date(interaction.occurred_at || interaction.created_at || '')
    return interactionDate.getMonth() === currentMonth && interactionDate.getFullYear() === currentYear
  }).length
})

// Days until graduation (May 31, 2028)
const daysUntilGraduation = computed(() => {
  const graduationDate = new Date(2028, 4, 31) // May 31, 2028 (0-based month)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  graduationDate.setHours(0, 0, 0, 0)

  const diffTime = graduationDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
})
</script>
