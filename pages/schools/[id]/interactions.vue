<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <Header />

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink :to="`/schools/${id}`" class="text-blue-600 hover:text-blue-700 font-semibold text-sm">
          ← Back to School
        </NuxtLink>
      </div>

      <!-- Header -->
      <div class="bg-white border-b border-slate-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-8">
        <div class="flex items-center justify-between gap-4 max-w-4xl mx-auto">
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">Interactions</h1>
            <p class="text-slate-600 text-sm">{{ interactions.length }} interaction{{ interactions.length !== 1 ? 's' : '' }}</p>
          </div>
          <button
            @click="showAddForm = !showAddForm"
            class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
          >
            <span v-if="!showAddForm">+</span>
            {{ showAddForm ? 'Cancel' : 'Log Interaction' }}
          </button>
        </div>
      </div>

      <!-- Add Interaction Form -->
      <div v-if="showAddForm" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <h2 class="text-xl font-semibold text-slate-900 mb-6">Log New Interaction</h2>

        <form @submit.prevent="handleAddInteraction" class="space-y-5">
          <!-- Type -->
          <div>
            <label for="type" class="block text-sm font-medium text-slate-700 mb-2">
              Type <span class="text-red-600">*</span>
            </label>
            <select
              id="type"
              v-model="newInteraction.type"
              required
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :disabled="loading"
            >
              <option value="">Select Type</option>
              <option value="email">Email</option>
              <option value="text">Text Message</option>
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
            <label for="direction" class="block text-sm font-medium text-slate-700 mb-2">
              Direction <span class="text-red-600">*</span>
            </label>
            <select
              id="direction"
              v-model="newInteraction.direction"
              required
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :disabled="loading"
            >
              <option value="">Select Direction</option>
              <option value="outbound">Outbound (We initiated)</option>
              <option value="inbound">Inbound (They contacted us)</option>
            </select>
          </div>

          <!-- Coach (optional) -->
          <div v-if="coaches.length > 0">
            <label for="coach" class="block text-sm font-medium text-slate-700 mb-2">
              Coach (Optional)
            </label>
            <select
              id="coach"
              v-model="newInteraction.coach_id"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :disabled="loading"
            >
              <option value="">Select Coach</option>
              <option v-for="coach in coaches" :key="coach.id" :value="coach.id">
                {{ coach.first_name }} {{ coach.last_name }} ({{ roleLabel(coach.role) }})
              </option>
            </select>
          </div>

          <!-- Subject -->
          <div>
            <label for="subject" class="block text-sm font-medium text-slate-700 mb-2">
              Subject
            </label>
            <input
              id="subject"
              v-model="newInteraction.subject"
              type="text"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Initial contact, Recruitment conversation"
              :disabled="loading"
            />
          </div>

          <!-- Content -->
          <div>
            <label for="content" class="block text-sm font-medium text-slate-700 mb-2">
              Content <span class="text-red-600">*</span>
            </label>
            <textarea
              id="content"
              v-model="newInteraction.content"
              required
              rows="5"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Details about the interaction..."
              :disabled="loading"
            />
          </div>

          <!-- Sentiment -->
          <div>
            <label for="sentiment" class="block text-sm font-medium text-slate-700 mb-2">
              Sentiment
            </label>
            <select
              id="sentiment"
              v-model="newInteraction.sentiment"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :disabled="loading"
            >
              <option value="">Not specified</option>
              <option value="very_positive">Very Positive</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          <!-- Date/Time -->
          <div>
            <label for="occurred_at" class="block text-sm font-medium text-slate-700 mb-2">
              Date & Time <span class="text-red-600">*</span>
            </label>
            <input
              id="occurred_at"
              v-model="newInteraction.occurred_at"
              type="datetime-local"
              required
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :disabled="loading"
            />
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="loading || !newInteraction.type || !newInteraction.direction || !newInteraction.content || !newInteraction.occurred_at"
              class="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Logging...' : 'Log Interaction' }}
            </button>
            <button
              type="button"
              @click="showAddForm = false"
              class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="loading && interactions.length === 0" class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-slate-600">Loading interactions...</p>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && interactions.length === 0" class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <ChatBubbleLeftRightIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p class="text-slate-900 font-medium mb-2">No interactions logged yet</p>
        <button @click="showAddForm = true" class="text-blue-600 hover:text-blue-700 font-medium text-sm">
          Log your first interaction
        </button>
      </div>

      <!-- Interactions Timeline -->
      <div v-if="interactions.length > 0" class="space-y-4">
        <div
          v-for="interaction in interactions"
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
                      {{ interaction.direction === 'outbound' ? 'Outbound' : 'Inbound' }}
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

                  <!-- Coach -->
                  <p class="text-sm text-slate-500 mt-1">
                    <span v-if="interaction.coach_id">{{ getCoachDisplay(interaction.coach_id) }}</span>
                    <span v-if="interaction.coach_id"> • </span>
                    <span>Logged {{ formatRelativeDate(interaction.created_at) }}</span>
                  </p>

                  <!-- Content Preview -->
                  <p v-if="interaction.content" class="text-sm text-slate-600 mt-2 line-clamp-2">
                    {{ interaction.content }}
                  </p>

                  <!-- Meta -->
                  <div class="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span class="flex items-center gap-1">
                      <CalendarIcon class="w-3.5 h-3.5" />
                      {{ formatDate(interaction.occurred_at) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Delete Button -->
              <button
                @click="deleteInteraction(interaction.id)"
                class="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { useInteractions } from '~/composables/useInteractions'
import { useCoaches } from '~/composables/useCoaches'
import { useSchools } from '~/composables/useSchools'
import type { Interaction } from '~/types/models'
import {
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  VideoCameraIcon,
  UserGroupIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({
})

const route = useRoute()
const id = route.params.id as string

const { interactions, loading, fetchInteractions, createInteraction, deleteInteraction: deleteInteractionAPI } = useInteractions()
const { coaches, fetchCoaches } = useCoaches()
const { getSchool } = useSchools()

const showAddForm = ref(false)
const schoolName = ref('')
const coachMap = ref<Record<string, string>>({})

const newInteraction = reactive({
  type: '',
  direction: '',
  coach_id: '',
  subject: '',
  content: '',
  sentiment: '',
  occurred_at: new Date().toISOString().slice(0, 16),
})

const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    head: 'Head Coach',
    assistant: 'Assistant Coach',
    recruiting: 'Recruiting Coordinator',
  }
  return labels[role] || role
}

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

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatRelativeDate = (dateStr: string | undefined) => {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  const now = new Date()
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (secondsAgo < 60) return 'just now'
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const getCoachDisplay = (coachId: string | null | undefined) => {
  if (!coachId) return ''
  return coachMap.value[coachId] || ''
}

const handleAddInteraction = async () => {
  try {
    // Convert datetime-local format to ISO 8601 with Z
    const occurredAtDate = new Date(newInteraction.occurred_at)
    const isoDatetime = occurredAtDate.toISOString()

    await createInteraction({
      school_id: id,
      coach_id: newInteraction.coach_id ? newInteraction.coach_id : null,
      event_id: null,
      type: newInteraction.type as Interaction['type'],
      direction: newInteraction.direction as 'outbound' | 'inbound',
      subject: newInteraction.subject || null,
      content: newInteraction.content,
      sentiment: (newInteraction.sentiment || null) as Interaction['sentiment'],
      occurred_at: isoDatetime,
      logged_by: '', // Server will set this from auth
      attachments: [],
    })

    // Reset form
    newInteraction.type = ''
    newInteraction.direction = ''
    newInteraction.coach_id = ''
    newInteraction.subject = ''
    newInteraction.content = ''
    newInteraction.sentiment = ''
    newInteraction.occurred_at = new Date().toISOString().slice(0, 16)
    showAddForm.value = false

    // Refresh list
    await fetchInteractions({ schoolId: id })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Failed to log interaction:', errorMsg)
    alert(`Failed to log interaction: ${errorMsg}`)
  }
}

const deleteInteraction = async (interactionId: string) => {
  if (confirm('Are you sure you want to delete this interaction?')) {
    try {
      await deleteInteractionAPI(interactionId)
    } catch (err) {
      console.error('Failed to delete interaction:', err)
    }
  }
}

onMounted(async () => {
  try {
    const school = await getSchool(id)
    if (school) {
      schoolName.value = school.name
    }

    await Promise.all([
      fetchInteractions({ schoolId: id }),
      fetchCoaches(id),
    ])

    // Build coach map for display
    coaches.value.forEach((coach) => {
      coachMap.value[coach.id] = `${coach.first_name} ${coach.last_name}`
    })
  } catch (err) {
    console.error('Error loading interactions page:', err)
  }
})
</script>
