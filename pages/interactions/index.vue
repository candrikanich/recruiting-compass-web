<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <!-- Global Navigation -->

    <!-- Timeline Status Snippet -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <StatusSnippet context="interactions" />
    </div>

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">Interactions</h1>
            <p class="text-slate-600">{{ filteredInteractions.length }} interaction{{ filteredInteractions.length !== 1 ? 's' : '' }} found</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              v-if="filteredInteractions.length > 0"
              @click="handleExportCSV"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              CSV
            </button>
            <button
              v-if="filteredInteractions.length > 0"
              @click="handleExportPDF"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              PDF
            </button>
            <NuxtLink
              to="/interactions/add"
              class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
            >
              <PlusIcon class="w-4 h-4" />
              Log Interaction
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Analytics Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ChatBubbleLeftRightIcon class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900">{{ allInteractions.length }}</p>
              <p class="text-sm text-slate-500">Total</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ArrowUpIcon class="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900">{{ outboundCount }}</p>
              <p class="text-sm text-slate-500">Outbound</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <ArrowDownIcon class="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900">{{ inboundCount }}</p>
              <p class="text-sm text-slate-500">Inbound</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <CalendarIcon class="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900">{{ thisWeekCount }}</p>
              <p class="text-sm text-slate-500">This Week</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <div class="relative">
              <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                :value="filterValues.get('search') || ''"
                @input="handleFilterUpdate('search', ($event.target as HTMLInputElement).value)"
                placeholder="Subject, content..."
                class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <!-- Type -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              :value="filterValues.get('type') || ''"
              @change="handleFilterUpdate('type', ($event.target as HTMLSelectElement).value || null)"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- All --</option>
              <option value="email">Email</option>
              <option value="text">Text</option>
              <option value="phone_call">Phone Call</option>
              <option value="in_person_visit">In-Person Visit</option>
              <option value="virtual_meeting">Virtual Meeting</option>
              <option value="camp">Camp</option>
              <option value="showcase">Showcase</option>
              <option value="tweet">Tweet</option>
              <option value="dm">Direct Message</option>
            </select>
          </div>

          <!-- Direction -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Direction</label>
            <select
              :value="filterValues.get('direction') || ''"
              @change="handleFilterUpdate('direction', ($event.target as HTMLSelectElement).value || null)"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- All --</option>
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
          </div>

          <!-- Sentiment -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Sentiment</label>
            <select
              :value="filterValues.get('sentiment') || ''"
              @change="handleFilterUpdate('sentiment', ($event.target as HTMLSelectElement).value || null)"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- All --</option>
              <option value="very_positive">Very Positive</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          <!-- Time Period -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Time Period</label>
            <select
              :value="filterValues.get('timePeriod') || ''"
              @change="handleFilterUpdate('timePeriod', ($event.target as HTMLSelectElement).value || null)"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- All Time --</option>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>

        <!-- Active Filters -->
        <div v-if="hasActiveFilters" class="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 flex-wrap">
          <span class="text-sm text-slate-500">Active filters:</span>
          <button
            v-if="filterValues.get('search')"
            @click="handleFilterUpdate('search', null)"
            class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
          >
            Search: {{ filterValues.get('search') }}
            <XMarkIcon class="w-3 h-3" />
          </button>
          <button
            v-if="filterValues.get('type')"
            @click="handleFilterUpdate('type', null)"
            class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
          >
            Type: {{ formatType(filterValues.get('type') as string) }}
            <XMarkIcon class="w-3 h-3" />
          </button>
          <button
            v-if="filterValues.get('direction')"
            @click="handleFilterUpdate('direction', null)"
            class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
          >
            {{ formatDirection(filterValues.get('direction') as string) }}
            <XMarkIcon class="w-3 h-3" />
          </button>
          <button
            v-if="filterValues.get('sentiment')"
            @click="handleFilterUpdate('sentiment', null)"
            class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
          >
            {{ formatSentiment(filterValues.get('sentiment') as string) }}
            <XMarkIcon class="w-3 h-3" />
          </button>
          <button
            v-if="filterValues.get('timePeriod')"
            @click="handleFilterUpdate('timePeriod', null)"
            class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
          >
            Last {{ filterValues.get('timePeriod') }} days
            <XMarkIcon class="w-3 h-3" />
          </button>
          <button
            @click="clearFilters"
            class="text-xs text-slate-500 hover:text-slate-700 underline ml-2"
          >
            Clear all
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && allInteractions.length === 0" class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-slate-600">Loading interactions...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="allInteractions.length === 0" class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <ChatBubbleLeftRightIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p class="text-slate-900 font-medium mb-2">No interactions yet</p>
        <NuxtLink to="/interactions/add" class="text-blue-600 hover:text-blue-700 font-medium">
          Log your first interaction
        </NuxtLink>
      </div>

      <!-- No Results State -->
      <div v-else-if="filteredInteractions.length === 0" class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <MagnifyingGlassIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p class="text-slate-900 font-medium mb-2">No interactions match your filters</p>
        <p class="text-sm text-slate-500">Try adjusting your search or filters</p>
      </div>

      <!-- Interactions Timeline -->
      <div v-else class="space-y-4">
        <div
          v-for="interaction in filteredInteractions"
          :key="interaction.id"
          class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
        >
          <div class="p-5">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-4 flex-1 min-w-0">
                <!-- Type Icon -->
                <div
                  class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  :class="getTypeIconBg(interaction.type)"
                >
                  <component :is="getTypeIcon(interaction.type)" class="w-5 h-5" :class="getTypeIconColor(interaction.type)" />
                </div>

                <div class="flex-1 min-w-0">
                  <!-- Header -->
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class="font-semibold text-slate-900">{{ formatType(interaction.type) }}</span>
                    <span
                      class="px-2 py-0.5 text-xs font-medium rounded-full"
                      :class="interaction.direction === 'outbound' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'"
                    >
                      {{ formatDirection(interaction.direction) }}
                    </span>
                    <span
                      v-if="interaction.sentiment"
                      class="px-2 py-0.5 text-xs font-medium rounded-full"
                      :class="getSentimentBadgeClass(interaction.sentiment)"
                    >
                      {{ formatSentiment(interaction.sentiment) }}
                    </span>
                  </div>

                  <!-- Subject -->
                  <p v-if="interaction.subject" class="text-slate-700 font-medium truncate">
                    {{ interaction.subject }}
                  </p>

                  <!-- School & Coach -->
                  <p class="text-sm text-slate-500 mt-1">
                    {{ getSchoolName(interaction.school_id) }}
                    <span v-if="interaction.coach_id" class="text-slate-400">
                      &bull; {{ getCoachName(interaction.coach_id) }}
                    </span>
                  </p>

                  <!-- Content Preview -->
                  <p v-if="interaction.content" class="text-sm text-slate-600 mt-2 line-clamp-2">
                    {{ interaction.content }}
                  </p>

                  <!-- Meta -->
                  <div class="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span class="flex items-center gap-1">
                      <CalendarIcon class="w-3.5 h-3.5" />
                      {{ formatDateTime(interaction.occurred_at || interaction.created_at) }}
                    </span>
                    <span v-if="interaction.attachments && interaction.attachments.length > 0" class="flex items-center gap-1">
                      <PaperClipIcon class="w-3.5 h-3.5" />
                      {{ interaction.attachments.length }} file(s)
                    </span>
                  </div>
                </div>
              </div>

              <!-- Action -->
              <button
                @click="viewInteraction(interaction)"
                class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
              >
                View
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue'
import { useInteractions } from '~/composables/useInteractions'
import { useSchools } from '~/composables/useSchools'
import { useCoaches } from '~/composables/useCoaches'
import { useUserStore } from '~/stores/user'
import Header from '~/components/Header.vue'
import StatusSnippet from '~/components/Timeline/StatusSnippet.vue'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  VideoCameraIcon,
  UserGroupIcon,
  PaperClipIcon,
} from '@heroicons/vue/24/outline'
import type { Interaction } from '~/types/models'
import { exportInteractionsToCSV, generateInteractionsPDF, type InteractionExportData } from '~/utils/exportUtils'

definePageMeta({
  middleware: 'auth',
})

const userStore = useUserStore()
const { interactions: interactionsData, fetchInteractions } = useInteractions()
const { schools: schoolsData, fetchSchools } = useSchools()
const { coaches: coachesData, fetchAllCoaches } = useCoaches()

// Data
const allInteractions = ref<Interaction[]>([])
const schools = ref<any[]>([])
const coaches = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const filterValues = ref(new Map<string, string | null>())

// Analytics
const outboundCount = computed(() => allInteractions.value.filter(i => i.direction === 'outbound').length)
const inboundCount = computed(() => allInteractions.value.filter(i => i.direction === 'inbound').length)
const thisWeekCount = computed(() => {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return allInteractions.value.filter(i => {
    const date = new Date(i.occurred_at || i.created_at || '')
    return date >= weekAgo
  }).length
})

const hasActiveFilters = computed(() => {
  for (const [, value] of filterValues.value) {
    if (value) return true
  }
  return false
})

const handleFilterUpdate = (field: string, value: string | null) => {
  const newMap = new Map(filterValues.value)
  if (value) {
    newMap.set(field, value)
  } else {
    newMap.delete(field)
  }
  filterValues.value = newMap
}

const clearFilters = () => {
  filterValues.value = new Map()
}

// Filtered interactions
const filteredInteractions = computed(() => {
  return allInteractions.value.filter((interaction) => {
    // Search filter
    const searchTerm = filterValues.value.get('search')
    if (searchTerm) {
      const searchLower = String(searchTerm).toLowerCase()
      const matchesSearch =
        (interaction.subject?.toLowerCase().includes(searchLower) || false) ||
        (interaction.content?.toLowerCase().includes(searchLower) || false)
      if (!matchesSearch) return false
    }

    // Type filter
    const typeFilter = filterValues.value.get('type')
    if (typeFilter && interaction.type !== typeFilter) {
      return false
    }

    // Direction filter
    const directionFilter = filterValues.value.get('direction')
    if (directionFilter && interaction.direction !== directionFilter) {
      return false
    }

    // Sentiment filter
    const sentimentFilter = filterValues.value.get('sentiment')
    if (sentimentFilter && interaction.sentiment !== sentimentFilter) {
      return false
    }

    // Time period filter
    const timePeriodFilter = filterValues.value.get('timePeriod')
    if (timePeriodFilter) {
      const days = parseInt(timePeriodFilter, 10)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      const dateValue = interaction.occurred_at || interaction.created_at
      if (!dateValue) return false
      const interactionDate = new Date(dateValue)
      if (interactionDate < cutoffDate) return false
    }

    return true
  }).sort((a, b) => {
    const dateA = new Date(a.occurred_at || a.created_at || '').getTime()
    const dateB = new Date(b.occurred_at || b.created_at || '').getTime()
    return dateB - dateA // Newest first
  })
})

const getTypeIcon = (type: string): Component => {
  const icons: Record<string, Component> = {
    email: EnvelopeIcon,
    text: ChatBubbleLeftIcon,
    phone_call: PhoneIcon,
    in_person_visit: UserGroupIcon,
    virtual_meeting: VideoCameraIcon,
    camp: UserGroupIcon,
    showcase: UserGroupIcon,
    tweet: ChatBubbleLeftIcon,
    dm: ChatBubbleLeftIcon,
  }
  return icons[type] || ChatBubbleLeftIcon
}

const getTypeIconBg = (type: string): string => {
  const bgs: Record<string, string> = {
    email: 'bg-blue-100',
    text: 'bg-green-100',
    phone_call: 'bg-purple-100',
    in_person_visit: 'bg-amber-100',
    virtual_meeting: 'bg-indigo-100',
    camp: 'bg-orange-100',
    showcase: 'bg-pink-100',
    tweet: 'bg-sky-100',
    dm: 'bg-violet-100',
  }
  return bgs[type] || 'bg-slate-100'
}

const getTypeIconColor = (type: string): string => {
  const colors: Record<string, string> = {
    email: 'text-blue-600',
    text: 'text-green-600',
    phone_call: 'text-purple-600',
    in_person_visit: 'text-amber-600',
    virtual_meeting: 'text-indigo-600',
    camp: 'text-orange-600',
    showcase: 'text-pink-600',
    tweet: 'text-sky-600',
    dm: 'text-violet-600',
  }
  return colors[type] || 'text-slate-600'
}

const formatType = (type: string): string => {
  const typeMap: Record<string, string> = {
    email: 'Email',
    text: 'Text',
    phone_call: 'Phone Call',
    in_person_visit: 'In-Person Visit',
    virtual_meeting: 'Virtual Meeting',
    camp: 'Camp',
    showcase: 'Showcase',
    tweet: 'Tweet',
    dm: 'Direct Message',
  }
  return typeMap[type] || type
}

const formatDirection = (direction: string): string => {
  return direction === 'outbound' ? 'Outbound' : 'Inbound'
}

const formatSentiment = (sentiment: string): string => {
  const sentimentMap: Record<string, string> = {
    very_positive: 'Very Positive',
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
  }
  return sentimentMap[sentiment] || sentiment
}

const getSentimentBadgeClass = (sentiment: string): string => {
  const classes: Record<string, string> = {
    very_positive: 'bg-emerald-100 text-emerald-700',
    positive: 'bg-blue-100 text-blue-700',
    neutral: 'bg-slate-100 text-slate-700',
    negative: 'bg-red-100 text-red-700',
  }
  return classes[sentiment] || 'bg-slate-100 text-slate-700'
}

const formatDateTime = (dateStr: string | undefined): string => {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getSchoolName = (schoolId: string | undefined): string => {
  if (!schoolId) return 'Unknown'
  return schools.value.find((s) => s.id === schoolId)?.name || 'Unknown'
}

const getCoachName = (coachId: string | undefined): string => {
  if (!coachId) return 'Unknown'
  const coach = coaches.value.find((c) => c.id === coachId)
  return coach ? `${coach.first_name} ${coach.last_name}` : 'Unknown'
}

const viewInteraction = async (interaction: Interaction) => {
  await navigateTo(`/interactions/${interaction.id}`)
}

// Export functions
const getExportData = (): InteractionExportData[] => {
  return filteredInteractions.value.map((interaction) => ({
    ...interaction,
    schoolName: getSchoolName(interaction.school_id),
    coachName: interaction.coach_id ? getCoachName(interaction.coach_id) : undefined,
  }))
}

const handleExportCSV = () => {
  const data = getExportData()
  if (data.length === 0) return
  exportInteractionsToCSV(data)
}

const handleExportPDF = () => {
  const data = getExportData()
  if (data.length === 0) return
  generateInteractionsPDF(data)
}

// Load data
onMounted(async () => {
  if (!userStore.user) return

  try {
    loading.value = true
    await fetchSchools()
    await fetchAllCoaches()
    await fetchInteractions({})
    schools.value = schoolsData.value
    coaches.value = coachesData.value
    allInteractions.value = interactionsData.value
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load interactions'
    error.value = message
    console.error('Error loading interactions:', err)
  } finally {
    loading.value = false
  }
})
</script>
