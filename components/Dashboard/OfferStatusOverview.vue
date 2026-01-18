<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-slate-900">💰 Offer Status Overview</h2>
      <NuxtLink to="/offers" class="text-sm font-medium text-blue-600 hover:text-blue-700">
        View All →
      </NuxtLink>
    </div>

    <!-- No Offers State -->
    <div v-if="offers.length === 0" class="text-center py-8 text-slate-600">
      <p class="text-4xl mb-3">📬</p>
      <p>No offers yet</p>
      <p class="text-sm mt-1">Offers will appear here when received</p>
    </div>

    <template v-else>
      <!-- Status Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="rounded-lg p-3 text-center bg-emerald-50">
          <p class="text-2xl font-bold text-emerald-600">{{ acceptedCount }}</p>
          <p class="text-xs font-medium text-emerald-700">Accepted</p>
        </div>
        <div class="rounded-lg p-3 text-center bg-blue-50">
          <p class="text-2xl font-bold text-blue-600">{{ pendingCount }}</p>
          <p class="text-xs font-medium text-blue-700">Pending</p>
        </div>
        <div class="rounded-lg p-3 text-center bg-orange-50">
          <p class="text-2xl font-bold text-orange-600">{{ expiringCount }}</p>
          <p class="text-xs font-medium text-orange-700">Expiring Soon</p>
        </div>
        <div class="rounded-lg p-3 text-center bg-slate-100">
          <p class="text-2xl font-bold text-slate-600">{{ declinedCount }}</p>
          <p class="text-xs font-medium text-slate-600">Declined</p>
        </div>
      </div>

      <!-- Scholarship Summary -->
      <div class="rounded-lg p-4 mb-6 bg-gradient-to-r from-emerald-50 to-blue-50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-600">Total Scholarship Value</p>
            <p class="text-2xl font-bold text-slate-900">{{ formatCurrency(totalScholarshipValue) }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-slate-600">Average Offer</p>
            <p class="text-xl font-bold text-slate-900">{{ averagePercentage }}%</p>
          </div>
        </div>
      </div>

      <!-- Upcoming Deadlines -->
      <div v-if="upcomingDeadlines.length > 0">
        <h3 class="text-sm font-semibold mb-3 text-slate-900">Upcoming Deadlines</h3>
        <div class="space-y-2">
          <div
            v-for="offer in upcomingDeadlines"
            :key="offer.id"
            class="flex items-center justify-between p-3 rounded-lg border"
            :class="[
              isUrgent(offer.deadline_date)
                ? 'bg-red-50 border-red-300'
                : 'bg-slate-50 border-slate-200'
            ]"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-2 h-2 rounded-full"
                :class="isUrgent(offer.deadline_date) ? 'bg-red-500' : 'bg-orange-500'"
              />
              <div>
                <p class="font-medium text-sm text-slate-900">{{ getSchoolName(offer.school_id) }}</p>
                <p class="text-xs text-slate-600">{{ formatPercentage(offer.scholarship_percentage) }} scholarship</p>
              </div>
            </div>
            <div class="text-right">
              <p
                class="text-sm font-semibold"
                :class="isUrgent(offer.deadline_date) ? 'text-red-600' : 'text-orange-600'"
              >
                {{ formatDeadline(offer.deadline_date) }}
              </p>
              <p class="text-xs text-slate-600">{{ daysUntil(offer.deadline_date) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Offers -->
      <div v-if="recentOffers.length > 0" class="mt-6">
        <h3 class="text-sm font-semibold mb-3 text-slate-900">Recent Offers</h3>
        <div class="space-y-2">
          <div
            v-for="offer in recentOffers"
            :key="offer.id"
            class="flex items-center justify-between p-3 rounded-lg bg-slate-50"
          >
            <div>
              <p class="font-medium text-sm text-slate-900">{{ getSchoolName(offer.school_id) }}</p>
              <p class="text-xs text-slate-600">{{ formatDate(offer.offer_date) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 rounded text-xs font-semibold" :class="getStatusStyle(offer.status)">
                {{ formatStatus(offer.status) }}
              </span>
              <span class="text-sm font-bold text-emerald-600">{{ formatPercentage(offer.scholarship_percentage) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Offer, School } from '~/types/models'

interface Props {
  offers: Offer[]
  schools: School[]
}

const props = defineProps<Props>()

// Status counts
const acceptedCount = computed(() => props.offers.filter(o => o.status === 'accepted').length)
const pendingCount = computed(() => props.offers.filter(o => o.status === 'pending').length)
const declinedCount = computed(() => props.offers.filter(o => o.status === 'declined').length)

// Expiring soon (within 14 days)
const expiringCount = computed(() => {
  const now = new Date()
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  return props.offers.filter(o => {
    if (o.status !== 'pending' || !o.deadline_date) return false
    const deadline = new Date(o.deadline_date)
    return deadline >= now && deadline <= twoWeeks
  }).length
})

// Total scholarship value (assuming $50k/year average cost for calculation)
const AVG_YEARLY_COST = 50000
const totalScholarshipValue = computed(() => {
  return props.offers
    .filter(o => o.status === 'accepted' || o.status === 'pending')
    .reduce((sum, o) => {
      const percentage = o.scholarship_percentage || 0
      return sum + (percentage / 100) * AVG_YEARLY_COST * 4 // 4 years
    }, 0)
})

// Average scholarship percentage
const averagePercentage = computed(() => {
  const activeOffers = props.offers.filter(o => o.status === 'accepted' || o.status === 'pending')
  if (activeOffers.length === 0) return 0
  const total = activeOffers.reduce((sum, o) => sum + (o.scholarship_percentage || 0), 0)
  return Math.round(total / activeOffers.length)
})

// Upcoming deadlines (next 30 days, sorted by deadline)
const upcomingDeadlines = computed(() => {
  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  return props.offers
    .filter(o => {
      if (o.status !== 'pending' || !o.deadline_date) return false
      const deadline = new Date(o.deadline_date)
      return deadline >= now && deadline <= thirtyDays
    })
    .sort((a, b) => new Date(a.deadline_date!).getTime() - new Date(b.deadline_date!).getTime())
    .slice(0, 3)
})

// Recent offers (last 5, sorted by date)
const recentOffers = computed(() => {
  return [...props.offers]
    .sort((a, b) => new Date(b.offer_date || b.created_at || '').getTime() - new Date(a.offer_date || a.created_at || '').getTime())
    .slice(0, 3)
})

const getSchoolName = (schoolId: string): string => {
  const school = props.schools.find(s => s.id === schoolId)
  return school?.name || 'Unknown School'
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatPercentage = (percentage: number | null | undefined): string => {
  if (!percentage) return '0%'
  return `${percentage}%`
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDeadline = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'No deadline'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const daysUntil = (dateStr: string | null | undefined): string => {
  if (!dateStr) return ''
  const deadline = new Date(dateStr)
  const now = new Date()
  const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days} days`
}

const isUrgent = (dateStr: string | null | undefined): boolean => {
  if (!dateStr) return false
  const deadline = new Date(dateStr)
  const now = new Date()
  const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return days <= 7
}

const formatStatus = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
  }
  return labels[status] || status
}

const getStatusStyle = (status: string): string => {
  const styles: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800',
    accepted: 'bg-emerald-100 text-emerald-800',
    declined: 'bg-slate-100 text-slate-900',
    expired: 'bg-red-100 text-red-600',
  }
  return styles[status] || 'bg-slate-100 text-slate-900'
}
</script>
