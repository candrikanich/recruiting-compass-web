<template>
  <div class="rounded-lg shadow-md hover:shadow-lg transition-shadow p-5 bg-white">
    <!-- Header with name and role -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <h3 class="text-lg font-bold text-slate-900">
          {{ coach.first_name }} {{ coach.last_name }}
        </h3>
        <p class="text-sm capitalize text-slate-600">{{ roleLabel(coach.role) }}</p>
        <p v-if="schoolName" class="text-xs mt-1 text-slate-600">{{ schoolName }}</p>
      </div>
      <div v-if="coach.responsiveness_score !== undefined && coach.responsiveness_score !== null" class="text-right">
        <div class="inline-block px-3 py-1 rounded-full" :class="getResponsivenessLabelClass(coach.responsiveness_score)">
          <p class="text-xs font-semibold">{{ coach.responsiveness_score }}% • {{ getResponsivenessLabel(coach.responsiveness_score).label }}</p>
        </div>
      </div>
    </div>

    <!-- Contact info grid -->
    <div class="space-y-2 mb-4">
      <div v-if="coach.email" class="flex items-center text-sm text-slate-900">
        <span class="text-blue-600 mr-2">✉️</span>
        <a :href="`mailto:${coach.email}`" class="hover:underline break-all text-blue-600">
          {{ coach.email }}
        </a>
      </div>

      <div v-if="coach.phone" class="flex items-center text-sm text-slate-900">
        <span class="text-green-600 mr-2">📱</span>
        <a :href="`tel:${coach.phone}`" class="hover:underline text-blue-600">
          {{ coach.phone }}
        </a>
      </div>

      <div v-if="coach.twitter_handle" class="flex items-center text-sm text-slate-900">
        <ShareIcon class="w-4 h-4 text-blue-400 mr-2" />
        <a
          :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline text-blue-600"
        >
          {{ coach.twitter_handle }}
        </a>
      </div>

      <div v-if="coach.instagram_handle" class="flex items-center text-sm text-slate-900">
        <PhotoIcon class="w-4 h-4 text-pink-600 mr-2" />
        <a
          :href="`https://instagram.com/${coach.instagram_handle.replace('@', '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline text-blue-600"
        >
          {{ coach.instagram_handle }}
        </a>
      </div>

      <div v-if="coach.last_contact_date" class="flex items-center text-sm text-slate-600">
        <span class="mr-2">📅</span>
        <span>Last contact: {{ formatDate(coach.last_contact_date) }}</span>
      </div>
    </div>

    <!-- Notes section -->
    <div v-if="coach.notes" class="mb-4 pb-4 pt-4 border-t border-slate-200 text-slate-900">
      <p class="text-sm">{{ coach.notes }}</p>
    </div>

    <!-- Quick action buttons -->
    <div class="flex gap-3 flex-wrap items-center">
      <!-- Icon-only quick actions -->
      <div class="flex gap-2">
        <!-- Email -->
        <button
          v-if="coach.email"
          @click="emit('email', coach)"
          :title="`Email ${coach.email}`"
          class="p-2 rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200"
        >
          ✉️
        </button>
        <button
          v-else
          disabled
          :title="'No email address'"
          class="p-2 rounded cursor-not-allowed bg-slate-100 text-slate-400"
        >
          ✉️
        </button>

        <!-- Phone/Text -->
        <button
          v-if="coach.phone"
          @click="emit('text', coach)"
          :title="`Text ${coach.phone}`"
          class="p-2 rounded transition bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
        >
          💬
        </button>
        <button
          v-else
          disabled
          :title="'No phone number'"
          class="p-2 rounded cursor-not-allowed bg-slate-100 text-slate-400"
        >
          💬
        </button>

        <!-- Twitter -->
        <a
          v-if="coach.twitter_handle"
          :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
          target="_blank"
          rel="noopener noreferrer"
          :title="`Tweet @${coach.twitter_handle}`"
          class="p-2 rounded transition inline-block bg-blue-100 text-blue-600 hover:bg-blue-200"
        >
          🐦
        </a>
        <span
          v-else
          :title="'No Twitter handle'"
          class="p-2 rounded cursor-not-allowed inline-block bg-slate-100 text-slate-400"
        >
          🐦
        </span>

        <!-- Instagram -->
        <a
          v-if="coach.instagram_handle"
          :href="`https://instagram.com/${coach.instagram_handle.replace('@', '')}`"
          target="_blank"
          rel="noopener noreferrer"
          :title="`DM @${coach.instagram_handle}`"
          class="p-2 rounded transition inline-block bg-purple-100 text-purple-700 hover:bg-purple-200"
        >
          📸
        </a>
        <span
          v-else
          :title="'No Instagram handle'"
          class="p-2 rounded cursor-not-allowed inline-block bg-slate-100 text-slate-400"
        >
          📸
        </span>

        <!-- View Details -->
        <button
          @click="emit('view', coach)"
          title="View full profile and history"
          class="p-2 rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200"
        >
          👁️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShareIcon, PhotoIcon } from '@heroicons/vue/24/outline'
import type { Coach } from '~/types/models'
import { getResponsivenessLabel } from '~/utils/coachResponsiveness'

defineProps<{
  coach: Coach
  schoolName?: string
}>()

const emit = defineEmits<{
  email: [coach: Coach]
  text: [coach: Coach]
  tweet: [coach: Coach]
  instagram: [coach: Coach]
  view: [coach: Coach]
}>()

const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    head: 'Head Coach',
    assistant: 'Assistant Coach',
    recruiting: 'Recruiting Coordinator',
  }
  return labels[role] || role
}

const getResponsivenessLabelClass = (score: number): string => {
  const label = getResponsivenessLabel(score)
  const colors: Record<string, string> = {
    'bg-green-100': 'bg-emerald-100 text-emerald-800',
    'bg-yellow-100': 'bg-orange-100 text-orange-800',
    'bg-red-100': 'bg-purple-100 text-purple-800',
  }
  return colors[label.color] || 'bg-slate-100 text-slate-900'
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
