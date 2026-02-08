<template>
  <div class="space-y-6">
    <!-- Quick Actions -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 class="font-semibold text-slate-900 mb-4">Quick Actions</h3>
      <div class="space-y-3">
        <NuxtLink
          :to="`/schools/${schoolId}/interactions`"
          class="block w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-center flex items-center justify-center gap-2"
        >
          <ChatBubbleLeftRightIcon class="w-4 h-4" />
          Log Interaction
        </NuxtLink>
        <button
          @click="emit('open-email-modal')"
          class="block w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition text-center flex items-center justify-center gap-2"
        >
          <EnvelopeIcon class="w-4 h-4" />
          Send Email
        </button>
        <NuxtLink
          :to="`/schools/${schoolId}/coaches`"
          class="block w-full px-4 py-2.5 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition text-center flex items-center justify-center gap-2"
        >
          <UsersIcon class="w-4 h-4" />
          Manage Coaches
        </NuxtLink>
      </div>
    </div>

    <!-- Coaches -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <UserCircleIcon class="w-5 h-5 text-slate-400" />
          <h3 class="font-semibold text-slate-900">Coaches</h3>
        </div>
        <NuxtLink
          :to="`/schools/${schoolId}/coaches`"
          class="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Manage &rarr;
        </NuxtLink>
      </div>
      <div v-if="coaches.length > 0" class="space-y-3">
        <div
          v-for="coach in coaches"
          :key="coach.id"
          class="p-3 border border-slate-200 rounded-lg"
        >
          <p class="font-medium text-slate-900 text-sm">
            {{ coach.first_name }} {{ coach.last_name }}
          </p>
          <p class="text-xs text-slate-500 capitalize mb-2">
            {{ getRoleLabel(coach.role) }}
          </p>
          <div class="flex flex-wrap gap-1">
            <a
              v-if="coach.email"
              :href="`mailto:${coach.email}`"
              class="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
              title="Email"
            >
              <EnvelopeIcon class="w-3.5 h-3.5" />
            </a>
            <a
              v-if="coach.phone"
              :href="`sms:${coach.phone}`"
              class="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
              title="Text"
            >
              <ChatBubbleLeftIcon class="w-3.5 h-3.5" />
            </a>
            <a
              v-if="coach.phone"
              :href="`tel:${coach.phone}`"
              class="p-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
              title="Call"
            >
              <PhoneIcon class="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-4 text-slate-500 text-sm">
        No coaches added yet
      </div>
    </div>

    <!-- Ranking -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 class="font-semibold text-slate-900 mb-4">Ranking</h3>
      <div class="text-center py-4">
        <div class="w-16 h-1 bg-blue-500 mx-auto mb-2 rounded-full"></div>
        <p class="text-slate-600 text-sm">Current ranking</p>
      </div>
    </div>

    <!-- Attribution -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h4 class="font-semibold text-slate-900 mb-3">Attribution</h4>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-slate-600">Created by:</span>
          <span class="text-slate-900">Parent</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Last updated:</span>
          <span class="text-slate-900">Parent</span>
        </div>
        <div v-if="school.updated_at" class="text-slate-500 text-xs">
          {{ new Date(school.updated_at).toLocaleDateString() }}
        </div>
      </div>
    </div>

    <!-- Delete School -->
    <button
      @click="emit('delete')"
      class="w-full px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
    >
      <TrashIcon class="w-4 h-4" />
      Delete School
    </button>
  </div>
</template>

<script setup lang="ts">
import { getRoleLabel } from "~/utils/coachLabels";
import type { School, Coach } from "~/types/models";
import {
  ChatBubbleLeftRightIcon,
  UsersIcon,
  UserCircleIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";

defineProps<{
  schoolId: string;
  coaches: Coach[];
  school: School;
}>();

const emit = defineEmits<{
  "open-email-modal": [];
  delete: [];
}>();
</script>
