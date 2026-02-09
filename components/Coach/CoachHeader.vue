<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <!-- Header with Name and Badge -->
    <div class="flex items-start justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">
          {{ coach.first_name }} {{ coach.last_name }}
        </h1>
        <p class="text-lg text-slate-700 mt-1">
          {{ getRoleLabel(coach.role) }}
        </p>
        <p class="text-slate-600 mt-1" v-if="schoolName">
          {{ schoolName }}
        </p>
        <div
          v-if="coach.last_contact_date"
          class="flex items-center gap-2 text-slate-600 text-sm mt-3"
        >
          <CalendarIcon class="w-4 h-4" />
          Last contact: {{ formatDate(coach.last_contact_date) }} ({{
            daysAgo(coach.last_contact_date)
          }}
          days ago)
        </div>
        <div v-else class="flex items-center gap-2 text-slate-500 text-sm mt-3">
          <CalendarIcon class="w-4 h-4" />
          No contact recorded yet
        </div>
      </div>
      <ResponsivenessBadge
        v-if="
          coach.responsiveness_score !== undefined &&
          coach.responsiveness_score !== null
        "
        :percentage="coach.responsiveness_score"
      />
    </div>

    <!-- Contact Info Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div v-if="coach.email" class="flex items-center gap-3">
        <EnvelopeIcon class="w-5 h-5 text-slate-400" />
        <div>
          <div class="text-slate-600 text-sm">Email</div>
          <a
            :href="`mailto:${coach.email}`"
            class="text-blue-600 hover:text-blue-700"
          >
            {{ coach.email }}
          </a>
        </div>
      </div>
      <div v-if="coach.phone" class="flex items-center gap-3">
        <PhoneIcon class="w-5 h-5 text-slate-400" />
        <div>
          <div class="text-slate-600 text-sm">Phone</div>
          <a
            :href="`tel:${coach.phone}`"
            class="text-blue-600 hover:text-blue-700"
          >
            {{ coach.phone }}
          </a>
        </div>
      </div>
      <div v-if="coach.twitter_handle" class="flex items-center gap-3">
        <svg
          class="w-5 h-5 text-slate-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          />
        </svg>
        <div>
          <div class="text-slate-600 text-sm">Twitter/X</div>
          <a
            :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`View ${coach.first_name}'s Twitter profile (opens in new window)`"
            class="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {{ coach.twitter_handle }}
            <span aria-hidden="true" class="ml-1 inline-block">↗</span>
          </a>
        </div>
      </div>
      <div v-if="coach.instagram_handle" class="flex items-center gap-3">
        <svg
          class="w-5 h-5 text-slate-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
          />
        </svg>
        <div>
          <div class="text-slate-600 text-sm">Instagram</div>
          <a
            :href="`https://instagram.com/${coach.instagram_handle.replace('@', '')}`"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`View ${coach.first_name}'s Instagram profile (opens in new window)`"
            class="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
          >
            {{ coach.instagram_handle }}
            <span aria-hidden="true" class="ml-1 inline-block">↗</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Primary Action Buttons -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-if="coach.email"
        @click="$emit('send-email')"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-sm"
      >
        <EnvelopeIcon class="w-4 h-4" />
        Email
      </button>
      <button
        v-if="coach.phone"
        @click="$emit('send-text')"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition shadow-sm"
      >
        <ChatBubbleLeftIcon class="w-4 h-4" />
        Text
      </button>
      <button
        v-if="coach.phone"
        @click="$emit('call-coach')"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition shadow-sm"
      >
        <PhoneIcon class="w-4 h-4" />
        Call
      </button>
      <button
        v-if="coach.twitter_handle"
        @click="$emit('open-twitter')"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white text-sm font-semibold rounded-lg hover:from-sky-600 hover:to-sky-700 transition shadow-sm"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          />
        </svg>
        Twitter
      </button>
      <button
        v-if="coach.instagram_handle"
        @click="$emit('open-instagram')"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition shadow-sm"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
          />
        </svg>
        Instagram
      </button>
      <NuxtLink
        :to="`/coaches/${coach.id}/analytics`"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition shadow-sm"
      >
        <ChartBarIcon class="w-4 h-4" />
        Analytics
      </NuxtLink>
      <NuxtLink
        :to="`/coaches/${coach.id}/communications`"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white text-sm font-semibold rounded-lg hover:from-slate-600 hover:to-slate-700 transition shadow-sm"
      >
        <ChatBubbleLeftRightIcon class="w-4 h-4" />
        Messages
      </NuxtLink>
    </div>

    <!-- Secondary Actions -->
    <div class="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
      <NuxtLink
        :to="`/coaches/${coach.id}/availability`"
        class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
      >
        <CalendarIcon class="w-4 h-4" />
        Availability
      </NuxtLink>
      <NuxtLink
        :to="`/social/coach/${coach.id}`"
        class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
      >
        <RssIcon class="w-4 h-4" />
        Social Posts
      </NuxtLink>
      <button
        @click="$emit('edit-coach')"
        aria-label="Edit coach information"
        class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
      >
        <PencilIcon class="w-4 h-4" aria-hidden="true" />
        Edit
      </button>
      <button
        @click="$emit('delete-coach')"
        aria-label="Delete this coach permanently"
        data-test="coach-detail-delete-btn"
        class="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-50 transition ml-auto"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete Coach
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Coach } from "~/types/models";
import { getRoleLabel } from "~/utils/coachLabels";
import { formatDate, daysAgo } from "~/utils/dateFormatters";
import {
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  ChartBarIcon,
  PencilIcon,
  RssIcon,
} from "@heroicons/vue/24/outline";
import ResponsivenessBadge from "~/components/ResponsivenessBadge.vue";

defineProps<{
  coach: Coach;
  schoolName?: string;
}>();

defineEmits<{
  "send-email": [];
  "send-text": [];
  "call-coach": [];
  "open-twitter": [];
  "open-instagram": [];
  "edit-coach": [];
  "delete-coach": [];
}>();
</script>
