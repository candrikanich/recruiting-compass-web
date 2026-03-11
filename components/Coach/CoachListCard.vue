<template>
  <li
    class="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden"
  >
    <!-- Coach Header -->
    <div class="p-4 border-b border-slate-100">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <SchoolLogo v-if="school" :school="school" size="md" />
          <div
            v-else
            class="w-12 h-12 rounded-lg bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold"
          >
            {{ getInitials(coach) }}
          </div>
          <div>
            <h3 class="font-semibold text-slate-900">
              {{ coach.first_name }} {{ coach.last_name }}
            </h3>
            <p class="text-sm text-slate-500">
              {{ school?.name ?? "" }}
            </p>
          </div>
        </div>
        <span
          class="px-2 py-1 text-xs font-medium rounded-full"
          :class="getRoleBadgeClass(coach.role)"
          :aria-label="`Coach role: ${getRoleLabel(coach.role)}`"
        >
          {{ getRoleLabel(coach.role) }}
        </span>
      </div>
    </div>

    <!-- Coach Info -->
    <div class="p-4 space-y-3">
      <!-- Contact Info -->
      <div v-if="coach.email" class="flex items-center gap-2 text-sm">
        <EnvelopeIcon class="w-4 h-4 text-slate-400" />
        <span class="text-slate-600 truncate">{{ coach.email }}</span>
      </div>
      <div v-if="coach.phone" class="flex items-center gap-2 text-sm">
        <PhoneIcon class="w-4 h-4 text-slate-400" />
        <span class="text-slate-600">{{ coach.phone }}</span>
      </div>

      <!-- Responsiveness -->
      <div class="flex items-center justify-between">
        <label
          :for="`coach-responsiveness-${coach.id}`"
          class="text-sm text-slate-500"
        >
          Responsiveness
        </label>
        <div class="flex items-center gap-2">
          <div
            :id="`coach-responsiveness-${coach.id}`"
            class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-300"
            role="progressbar"
            :aria-valuenow="coach.responsiveness_score || 0"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`${coach.responsiveness_score || 0}% responsiveness score`"
          >
            <div
              class="h-full rounded-full transition-all relative"
              :class="getResponsivenessBarClass(coach.responsiveness_score || 0)"
              :style="{ width: `${coach.responsiveness_score || 0}%` }"
              aria-hidden="true"
            >
              <!-- Pattern for color-blind accessibility -->
              <div
                class="h-full opacity-20"
                style="
                  background-image: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 2px,
                    rgba(0, 0, 0, 0.1) 2px,
                    rgba(0, 0, 0, 0.1) 4px
                  );
                "
              ></div>
            </div>
          </div>
          <span
            class="text-sm font-medium tabular-nums"
            :class="getResponsivenessTextClass(coach.responsiveness_score || 0)"
            aria-hidden="true"
          >
            {{ coach.responsiveness_score || 0 }}%
          </span>
        </div>
      </div>

      <!-- Last Contact -->
      <div
        v-if="coach.last_contact_date"
        class="flex items-center justify-between text-sm"
      >
        <span class="text-slate-500">Last contact</span>
        <time :datetime="coach.last_contact_date" class="text-slate-700">
          {{ formatCoachDate(coach.last_contact_date) }}
          ({{ getDaysAgoExact(coach.last_contact_date) }})
        </time>
      </div>
    </div>

    <!-- Actions -->
    <div
      class="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between"
    >
      <div class="flex items-center gap-1">
        <button
          v-if="coach.email"
          data-testid="open-communication"
          @click="emit('open-communication', coach.id)"
          :aria-label="`Send email to ${coach.first_name} ${coach.last_name}`"
          class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <EnvelopeIcon class="w-5 h-5" aria-hidden="true" />
        </button>
        <button
          v-if="coach.phone"
          @click="emit('open-communication', coach.id)"
          :aria-label="`Send text message to ${coach.first_name} ${coach.last_name}`"
          class="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          <ChatBubbleLeftIcon class="w-5 h-5" aria-hidden="true" />
        </button>
        <button
          v-if="coach.twitter_handle"
          @click="openTwitter"
          :aria-label="`View ${coach.first_name}'s Twitter profile`"
          class="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          <svg
            class="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            />
          </svg>
        </button>
        <button
          v-if="coach.instagram_handle"
          @click="openInstagram"
          :aria-label="`View ${coach.first_name}'s Instagram profile`"
          class="p-2 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
        >
          <svg
            class="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
            />
          </svg>
        </button>
        <button
          data-testid="delete-coach"
          @click="emit('delete-coach', coach)"
          :aria-label="`Delete ${coach.first_name} ${coach.last_name}`"
          class="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
      <NuxtLink
        :to="`/coaches/${coach.id}`"
        class="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
      >
        View
      </NuxtLink>
    </div>
  </li>
</template>

<script setup lang="ts">
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import {
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/vue/24/outline";
import { getRoleLabel } from "~/utils/coachLabels";
import {
  formatCoachDate,
  getDaysAgoExact,
  getRoleBadgeClass,
  getResponsivenessBarClass,
  getResponsivenessTextClass,
} from "~/utils/coachFormatters";
import { getInitials } from "~/utils/coachHelpers";
import type { Coach, School } from "~/types/models";

interface Props {
  coach: Coach;
  school: School | undefined;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "open-communication": [coachId: string];
  "delete-coach": [coach: Coach];
}>();

const openTwitter = () => {
  if (props.coach.twitter_handle) {
    const handle = props.coach.twitter_handle.replace("@", "");
    window.open(`https://twitter.com/${handle}`, "_blank");
  }
};

const openInstagram = () => {
  if (props.coach.instagram_handle) {
    const handle = props.coach.instagram_handle.replace("@", "");
    window.open(`https://instagram.com/${handle}`, "_blank");
  }
};
</script>
