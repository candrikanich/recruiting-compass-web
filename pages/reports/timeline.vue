<template>
  <div class="min-h-screen bg-gray-50">
    <Header />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <NuxtLink to="/reports" class="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
              &larr; Back to Reports
            </NuxtLink>
            <h1 class="text-3xl font-bold text-gray-900">Recruiting Timeline</h1>
            <p class="text-gray-600">Visual overview of your recruiting journey</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="printTimeline"
              class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex flex-wrap items-center gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">View Range</label>
            <select v-model="viewRange" class="px-3 py-2 border border-gray-300 rounded-lg">
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Filter School</label>
            <select v-model="selectedSchool" class="px-3 py-2 border border-gray-300 rounded-lg min-w-48">
              <option value="">All Schools</option>
              <option v-for="school in schools" :key="school.id" :value="school.id">
                {{ school.name }}
              </option>
            </select>
          </div>
          <div class="flex items-end gap-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="showEvents" type="checkbox" class="rounded" />
              <span class="text-sm text-gray-700">Events</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="showInteractions" type="checkbox" class="rounded" />
              <span class="text-sm text-gray-700">Interactions</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="showOffers" type="checkbox" class="rounded" />
              <span class="text-sm text-gray-700">Offers</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading timeline data...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="timelineItems.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
        <p class="text-gray-600 mb-2">No timeline data available</p>
        <p class="text-sm text-gray-500">
          Add events, interactions, or offers to see them on the timeline
        </p>
      </div>

      <!-- Timeline View -->
      <div v-else class="bg-white rounded-lg shadow">
        <!-- Month Headers -->
        <div class="border-b border-gray-200 px-4 py-3">
          <div class="flex items-center gap-4 overflow-x-auto">
            <div
              v-for="month in visibleMonths"
              :key="month.key"
              class="flex-shrink-0 text-center min-w-32"
            >
              <div class="font-semibold text-gray-900">{{ month.label }}</div>
              <div class="text-xs text-gray-500">{{ month.year }}</div>
            </div>
          </div>
        </div>

        <!-- School Swimlanes -->
        <div class="divide-y divide-gray-200">
          <div
            v-for="swimlane in swimlanes"
            :key="swimlane.schoolId || 'no-school'"
            class="p-4"
          >
            <!-- School Header -->
            <div class="flex items-center gap-3 mb-3">
              <NuxtLink
                v-if="swimlane.schoolId"
                :to="`/schools/${swimlane.schoolId}`"
                class="font-semibold text-gray-900 hover:text-blue-600"
              >
                {{ swimlane.schoolName }}
              </NuxtLink>
              <span v-else class="font-semibold text-gray-500">No School</span>
              <span class="text-xs text-gray-500">({{ swimlane.items.length }} items)</span>
            </div>

            <!-- Timeline Bar -->
            <div class="relative h-16 bg-gray-100 rounded-lg overflow-hidden">
              <!-- Grid Lines -->
              <div class="absolute inset-0 flex">
                <div
                  v-for="(_, idx) in visibleMonths"
                  :key="idx"
                  class="flex-1 border-r border-gray-200 last:border-r-0"
                />
              </div>

              <!-- Today Marker -->
              <div
                v-if="todayPosition >= 0 && todayPosition <= 100"
                class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                :style="{ left: `${todayPosition}%` }"
              >
                <div class="absolute -top-1 left-1/2 -translate-x-1/2 text-xs text-red-500 font-semibold whitespace-nowrap">
                  Today
                </div>
              </div>

              <!-- Timeline Items -->
              <div
                v-for="item in swimlane.items"
                :key="item.id"
                :class="[
                  'absolute h-8 rounded px-2 flex items-center text-xs font-medium cursor-pointer transition-all hover:ring-2 hover:shadow-lg hover:scale-110',
                  getItemClass(item.type),
                ]"
                :style="getItemStyle(item)"
                :title="getItemTooltip(item)"
                @click="viewItem(item)"
              >
                <span class="truncate">{{ item.emoji }} {{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="border-t border-gray-200 px-4 py-3">
          <div class="flex items-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-blue-500 rounded" />
              <span class="text-gray-600">Events</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-green-500 rounded" />
              <span class="text-gray-600">Interactions</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-yellow-500 rounded" />
              <span class="text-gray-600">Offers</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-1 h-4 bg-red-500" />
              <span class="text-gray-600">Today</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline List View -->
      <div class="mt-8 bg-white rounded-lg shadow">
        <div class="border-b border-gray-200 px-4 py-3">
          <h2 class="font-semibold text-gray-900">Timeline List</h2>
        </div>
        <div class="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          <div
            v-for="item in sortedTimelineItems"
            :key="item.id"
            class="p-4 hover:bg-blue-50 cursor-pointer flex items-center gap-4 transition-colors"
            @click="viewItem(item)"
          >
            <div :class="['w-10 h-10 rounded-full flex items-center justify-center text-lg transition-transform hover:scale-110', getItemBgClass(item.type)]">
              {{ item.emoji }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">{{ item.label }}</div>
              <div class="text-sm text-gray-500">
                {{ item.schoolName || 'No school' }} &bull; {{ formatDate(item.date) }}
              </div>
            </div>
            <div :class="['px-2 py-1 rounded text-xs font-medium transition-all hover:shadow-md', getItemBadgeClass(item.type)]">
              {{ item.typeLabel }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSchools } from '~/composables/useSchools'
import { useInteractions } from '~/composables/useInteractions'
import { useOffers } from '~/composables/useOffers'
import { useEvents } from '~/composables/useEvents'

definePageMeta({
  middleware: 'auth',
})

interface TimelineItem {
  id: string
  type: 'event' | 'interaction' | 'offer'
  typeLabel: string
  emoji: string
  label: string
  date: Date
  endDate?: Date
  schoolId?: string
  schoolName?: string
}

const { schools, fetchSchools } = useSchools()
const { interactions, fetchInteractions } = useInteractions()
const { offers, fetchOffers } = useOffers()
const { events, fetchEvents } = useEvents()

const loading = ref(true)
const viewRange = ref('6')
const selectedSchool = ref('')
const showEvents = ref(true)
const showInteractions = ref(true)
const showOffers = ref(true)

const today = new Date()
today.setHours(0, 0, 0, 0)

// Calculate date range
const dateRange = computed(() => {
  const end = new Date()
  end.setMonth(end.getMonth() + 2) // Show 2 months into future

  let start = new Date()
  if (viewRange.value === 'all') {
    // Find earliest date from all items
    const allDates = timelineItems.value.map(i => i.date.getTime())
    if (allDates.length > 0) {
      start = new Date(Math.min(...allDates))
    } else {
      start.setMonth(start.getMonth() - 6)
    }
  } else {
    start.setMonth(start.getMonth() - parseInt(viewRange.value))
  }

  return { start, end }
})

// Generate visible months
const visibleMonths = computed(() => {
  const months: { key: string; label: string; year: number }[] = []
  const current = new Date(dateRange.value.start)
  current.setDate(1)

  while (current <= dateRange.value.end) {
    months.push({
      key: `${current.getFullYear()}-${current.getMonth()}`,
      label: current.toLocaleDateString('en-US', { month: 'short' }),
      year: current.getFullYear(),
    })
    current.setMonth(current.getMonth() + 1)
  }

  return months
})

// Calculate today's position as percentage
const todayPosition = computed(() => {
  const totalMs = dateRange.value.end.getTime() - dateRange.value.start.getTime()
  const todayMs = today.getTime() - dateRange.value.start.getTime()
  return (todayMs / totalMs) * 100
})

// Build timeline items from all data
const timelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []

  if (showEvents.value) {
    events.value.forEach((event) => {
      items.push({
        id: `event-${event.id}`,
        type: 'event',
        typeLabel: formatEventType(event.type),
        emoji: getEventEmoji(event.type),
        label: event.name,
        date: new Date(event.start_date),
        endDate: event.end_date ? new Date(event.end_date) : undefined,
        schoolId: event.school_id || undefined,
        schoolName: schools.value.find((s) => s.id === event.school_id)?.name,
      })
    })
  }

  if (showInteractions.value) {
    interactions.value.forEach((interaction) => {
      items.push({
        id: `interaction-${interaction.id}`,
        type: 'interaction',
        typeLabel: formatInteractionType(interaction.type),
        emoji: getInteractionEmoji(interaction.type),
        label: interaction.subject || formatInteractionType(interaction.type),
        date: new Date(interaction.occurred_at || interaction.created_at || ''),
        schoolId: interaction.school_id || undefined,
        schoolName: schools.value.find((s) => s.id === interaction.school_id)?.name,
      })
    })
  }

  if (showOffers.value) {
    offers.value.forEach((offer) => {
      items.push({
        id: `offer-${offer.id}`,
        type: 'offer',
        typeLabel: formatOfferType(offer.offer_type),
        emoji: '🎉',
        label: `${formatOfferType(offer.offer_type)} Offer`,
        date: new Date(offer.offer_date || offer.created_at || ''),
        schoolId: offer.school_id || undefined,
        schoolName: schools.value.find((s) => s.id === offer.school_id)?.name,
      })
    })
  }

  // Apply school filter
  if (selectedSchool.value) {
    return items.filter((item) => item.schoolId === selectedSchool.value)
  }

  return items
})

// Sorted timeline items for list view
const sortedTimelineItems = computed(() => {
  return [...timelineItems.value].sort((a, b) => b.date.getTime() - a.date.getTime())
})

// Group items by school for swimlane view
const swimlanes = computed(() => {
  const groups = new Map<string, TimelineItem[]>()

  timelineItems.value.forEach((item) => {
    const key = item.schoolId || 'no-school'
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(item)
  })

  return Array.from(groups.entries())
    .map(([schoolId, items]) => ({
      schoolId: schoolId === 'no-school' ? null : schoolId,
      schoolName: schoolId === 'no-school'
        ? 'No School'
        : schools.value.find((s) => s.id === schoolId)?.name || 'Unknown',
      items: items.sort((a, b) => a.date.getTime() - b.date.getTime()),
    }))
    .sort((a, b) => a.schoolName.localeCompare(b.schoolName))
})

// Helpers
const getItemClass = (type: string) => {
  switch (type) {
    case 'event':
      return 'bg-blue-500 text-white hover:ring-blue-300'
    case 'interaction':
      return 'bg-green-500 text-white hover:ring-green-300'
    case 'offer':
      return 'bg-yellow-500 text-white hover:ring-yellow-300'
    default:
      return 'bg-gray-500 text-white hover:ring-gray-300'
  }
}

const getItemBgClass = (type: string) => {
  switch (type) {
    case 'event':
      return 'bg-blue-100'
    case 'interaction':
      return 'bg-green-100'
    case 'offer':
      return 'bg-yellow-100'
    default:
      return 'bg-gray-100'
  }
}

const getItemBadgeClass = (type: string) => {
  switch (type) {
    case 'event':
      return 'bg-blue-100 text-blue-700'
    case 'interaction':
      return 'bg-green-100 text-green-700'
    case 'offer':
      return 'bg-yellow-100 text-yellow-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getItemStyle = (item: TimelineItem) => {
  const totalMs = dateRange.value.end.getTime() - dateRange.value.start.getTime()
  const startMs = item.date.getTime() - dateRange.value.start.getTime()
  const left = Math.max(0, Math.min(100, (startMs / totalMs) * 100))

  // Calculate width for events with end dates
  let width = 2 // minimum width in percent
  if (item.endDate) {
    const durationMs = item.endDate.getTime() - item.date.getTime()
    width = Math.max(2, (durationMs / totalMs) * 100)
  }

  return {
    left: `${left}%`,
    width: `${Math.min(width, 100 - left)}%`,
    top: '16px',
  }
}

const getItemTooltip = (item: TimelineItem) => {
  return `${item.label}\n${formatDate(item.date)}${item.endDate ? ` - ${formatDate(item.endDate)}` : ''}`
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatEventType = (type: string) => {
  const types: Record<string, string> = {
    showcase: 'Showcase',
    camp: 'Camp',
    official_visit: 'Official Visit',
    unofficial_visit: 'Unofficial Visit',
    game: 'Game',
  }
  return types[type] || type
}

const getEventEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    showcase: '🎯',
    camp: '⚾',
    official_visit: '✈️',
    unofficial_visit: '🚗',
    game: '🏟️',
  }
  return emojis[type] || '📅'
}

const formatInteractionType = (type: string) => {
  const types: Record<string, string> = {
    email: 'Email',
    phone_call: 'Phone Call',
    text: 'Text',
    in_person_visit: 'Visit',
    virtual_meeting: 'Virtual Meeting',
    camp: 'Camp',
    showcase: 'Showcase',
    tweet: 'Tweet',
    dm: 'DM',
  }
  return types[type] || type
}

const getInteractionEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    email: '📧',
    phone_call: '📞',
    text: '💬',
    in_person_visit: '👥',
    virtual_meeting: '💻',
    camp: '⚾',
    showcase: '🎯',
    tweet: '𝕏',
    dm: '💭',
  }
  return emojis[type] || '📝'
}

const formatOfferType = (type: string) => {
  const types: Record<string, string> = {
    full_ride: 'Full Ride',
    partial: 'Partial',
    scholarship: 'Scholarship',
    recruited_walk_on: 'Recruited Walk-On',
    preferred_walk_on: 'Preferred Walk-On',
  }
  return types[type] || type
}

const viewItem = (item: TimelineItem) => {
  if (item.type === 'event') {
    const eventId = item.id.replace('event-', '')
    navigateTo(`/events/${eventId}`)
  } else if (item.type === 'interaction') {
    const interactionId = item.id.replace('interaction-', '')
    navigateTo(`/interactions/${interactionId}`)
  } else if (item.type === 'offer') {
    const offerId = item.id.replace('offer-', '')
    navigateTo(`/offers/${offerId}`)
  }
}

const printTimeline = () => {
  window.print()
}

onMounted(async () => {
  loading.value = true
  await Promise.all([
    fetchSchools(),
    fetchInteractions({}),
    fetchOffers(),
    fetchEvents(),
  ])
  loading.value = false
})
</script>

<style scoped>
@media print {
  .no-print {
    display: none;
  }
}
</style>
