<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <h2 class="text-xl font-bold mb-6 text-slate-900">⏰ Upcoming Events & Deadlines</h2>

    <div class="space-y-4">
      <!-- Offer Deadlines -->
      <div v-if="upcomingOfferDeadlines.length > 0" class="pl-4 border-l-4 border-orange-400">
        <h3 class="font-semibold mb-3 flex items-center gap-2 text-slate-900">
          <span>🎯 Offer Deadlines</span>
          <span class="text-xs font-normal text-slate-600">({{ upcomingOfferDeadlines.length }})</span>
        </h3>
        <div class="space-y-2">
          <div v-for="offer in upcomingOfferDeadlines.slice(0, 5)" :key="offer.id" class="p-3 rounded-lg bg-orange-50">
            <div class="flex items-start justify-between mb-2">
              <div>
                <p class="font-semibold text-slate-900">{{ getSchoolName(offer.school_id) }}</p>
                <p class="text-sm text-slate-600">{{ getOfferTypeLabel(offer.offer_type) }}</p>
              </div>
              <span
                class="text-xs font-bold px-2 py-1 rounded"
                :class="daysUntilDeadline(offer.deadline_date) <= 7 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-700'"
              >
                {{ daysUntilDeadline(offer.deadline_date) }}d
              </span>
            </div>
            <p class="text-xs text-slate-600">{{ formatDate(offer.deadline_date) }}</p>
          </div>
        </div>
      </div>

      <!-- Upcoming Events -->
      <div v-if="upcomingEvents.length > 0" class="pl-4 pt-4 border-l-4 border-emerald-400 border-t border-slate-200">
        <h3 class="font-semibold mb-3 flex items-center gap-2 text-slate-900">
          <span>📅 Upcoming Events</span>
          <span class="text-xs font-normal text-slate-600">({{ upcomingEvents.length }})</span>
        </h3>
        <div class="space-y-2">
          <div v-for="event in upcomingEvents.slice(0, 5)" :key="event.id" class="p-3 rounded-lg bg-emerald-50">
            <div class="flex items-start justify-between mb-2">
              <div>
                <p class="font-semibold text-slate-900">{{ event.name }}</p>
                <p class="text-sm text-slate-600">{{ getEventTypeLabel(event.type) }}</p>
              </div>
              <span class="text-xs font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                {{ daysUntilDate(event.start_date) }}d
              </span>
            </div>
            <p class="text-xs text-slate-600">{{ event.location }}</p>
            <p class="text-xs mt-1 text-slate-600">{{ formatDate(event.start_date) }}</p>
          </div>
        </div>
      </div>

      <!-- No Upcoming Items -->
      <div v-if="upcomingOfferDeadlines.length === 0 && upcomingEvents.length === 0" class="text-center py-8 text-slate-600">
        <p>No upcoming deadlines or events</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Offer, Event, School } from '~/types/models'

interface Props {
  offers: Offer[]
  events: Event[]
  schools: School[]
}

const props = defineProps<Props>()

const schoolMap = computed(() => {
  const map: Record<string, string> = {}
  props.schools.forEach((s) => {
    map[s.id] = s.name
  })
  return map
})

const today = new Date()
today.setHours(0, 0, 0, 0)

const upcomingOfferDeadlines = computed(() => {
  return props.offers
    .filter((o) => o.deadline_date && new Date(o.deadline_date) >= today)
    .sort((a, b) => new Date(a.deadline_date || '').getTime() - new Date(b.deadline_date || '').getTime())
})

const upcomingEvents = computed(() => {
  return props.events
    .filter((e) => new Date(e.start_date) >= today)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
})

const getSchoolName = (schoolId: string): string => {
  return schoolMap.value[schoolId] || 'Unknown School'
}

const getOfferTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    full_ride: 'Full Ride',
    partial: 'Partial Scholarship',
    scholarship: 'Scholarship',
    recruited_walk_on: 'Recruited Walk-On',
    preferred_walk_on: 'Preferred Walk-On',
  }
  return labels[type] || type
}

const getEventTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    showcase: '🎯 Showcase',
    camp: '⚾ Camp',
    official_visit: '🏫 Official Visit',
    unofficial_visit: '🏫 Unofficial Visit',
    game: '🎮 Game',
  }
  return labels[type] || type
}

const daysUntilDeadline = (deadline?: string | null): number => {
  if (!deadline) return 999
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)
  const diffTime = deadlineDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const daysUntilDate = (dateStr: string): number => {
  const eventDate = new Date(dateStr)
  eventDate.setHours(0, 0, 0, 0)
  const diffTime = eventDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
