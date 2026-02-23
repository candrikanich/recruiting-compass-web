<template>
  <div
    class="rounded-lg shadow-md hover:shadow-lg transition-shadow p-5 bg-white"
  >
    <!-- Header with name and role -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <h3 class="text-lg font-bold text-slate-900">
          {{ coach.first_name }} {{ coach.last_name }}
        </h3>
        <p class="text-sm capitalize text-slate-600">
          {{ getRoleLabel(coach.role) }}
        </p>
        <p v-if="schoolName" class="text-xs mt-1 text-slate-600">
          {{ schoolName }}
        </p>
      </div>
      <div
        v-if="
          coach.responsiveness_score !== undefined &&
          coach.responsiveness_score !== null
        "
        class="text-right"
      >
        <div
          class="inline-block px-3 py-1 rounded-full"
          :class="getResponsivenessLabelClass(coach.responsiveness_score)"
        >
          <p class="text-xs font-semibold">
            {{ coach.responsiveness_score }}% •
            {{ getResponsivenessLabel(coach.responsiveness_score).label }}
          </p>
        </div>
      </div>
    </div>

    <!-- Contact info grid -->
    <div class="space-y-2 mb-4">
      <div v-if="coach.email" class="flex items-center text-sm text-slate-900">
        <span class="text-blue-600 mr-2" aria-hidden="true">✉️</span>
        <a
          :href="`mailto:${coach.email}`"
          class="hover:underline break-all text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
        >
          {{ coach.email }}
        </a>
      </div>

      <div v-if="coach.phone" class="flex items-center text-sm text-slate-900">
        <span class="text-green-600 mr-2" aria-hidden="true">📱</span>
        <a :href="`tel:${coach.phone}`" class="hover:underline text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded">
          {{ coach.phone }}
        </a>
      </div>

      <div
        v-if="coach.twitter_handle"
        class="flex items-center text-sm text-slate-900"
      >
        <ShareIcon class="w-4 h-4 text-blue-400 mr-2" aria-hidden="true" />
        <a
          :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
        >
          {{ coach.twitter_handle }}
        </a>
      </div>

      <div
        v-if="coach.instagram_handle"
        class="flex items-center text-sm text-slate-900"
      >
        <PhotoIcon class="w-4 h-4 text-pink-600 mr-2" aria-hidden="true" />
        <a
          :href="`https://instagram.com/${coach.instagram_handle.replace('@', '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
        >
          {{ coach.instagram_handle }}
        </a>
      </div>

      <div
        v-if="coach.last_contact_date"
        class="flex items-center text-sm text-slate-600"
      >
        <span class="mr-2" aria-hidden="true">📅</span>
        <span>Last contact: {{ formatDate(coach.last_contact_date) }}</span>
      </div>
    </div>

    <!-- Notes section -->
    <div
      v-if="coach.notes"
      class="mb-4 pb-4 pt-4 border-t border-slate-200 text-slate-900"
    >
      <p class="text-sm">{{ coach.notes }}</p>
    </div>

    <!-- Quick action buttons -->
    <div class="flex gap-3 flex-wrap items-center">
      <!-- Quick actions -->
      <div class="flex gap-2">
        <!-- Email -->
        <button
          v-if="coach.email"
          @click="emit('email', coach)"
          :aria-label="`Send email to ${coach.first_name} ${coach.last_name}`"
          title="Send email"
          class="px-3 py-1.5 rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Email
        </button>

        <!-- Phone/Text -->
        <button
          v-if="coach.phone"
          @click="emit('text', coach)"
          :aria-label="`Send text to ${coach.first_name} ${coach.last_name}`"
          title="Send text"
          class="px-3 py-1.5 rounded transition bg-emerald-100 text-emerald-700 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Text
        </button>

        <!-- Twitter -->
        <button
          v-if="coach.twitter_handle"
          @click="emit('tweet', coach)"
          :aria-label="`View ${coach.first_name} ${coach.last_name} on Twitter`"
          title="Visit Twitter"
          class="px-3 py-1.5 rounded transition inline-block bg-blue-100 text-blue-600 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Tweet
        </button>

        <!-- Instagram -->
        <button
          v-if="coach.instagram_handle"
          @click="emit('instagram', coach)"
          :aria-label="`View ${coach.first_name} ${coach.last_name} on Instagram`"
          title="Visit Instagram"
          class="px-3 py-1.5 rounded transition inline-block bg-purple-100 text-purple-700 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Instagram
        </button>

        <!-- View Details -->
        <button
          @click="emit('view', coach)"
          :aria-label="`View details for ${coach.first_name} ${coach.last_name}`"
          title="View details"
          class="px-3 py-1.5 rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShareIcon, PhotoIcon } from "@heroicons/vue/24/outline";
import { getRoleLabel } from "~/utils/coachLabels";
import type { Coach } from "~/types/models";
import { getResponsivenessLabel } from "~/utils/coachResponsiveness";

defineProps<{
  coach: Coach;
  schoolName?: string;
}>();

const emit = defineEmits<{
  email: [coach: Coach];
  text: [coach: Coach];
  tweet: [coach: Coach];
  instagram: [coach: Coach];
  view: [coach: Coach];
}>();

const getResponsivenessLabelClass = (score: number): string => {
  if (score >= 75) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (score >= 50) {
    return "bg-blue-100 text-blue-700";
  }
  if (score >= 25) {
    return "bg-orange-100 text-orange-800";
  }
  return "bg-purple-100 text-purple-800";
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
</script>
