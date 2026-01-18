<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <!-- Coaches Card -->
    <NuxtLink
      v-if="showCoaches"
      to="/coaches"
      class="relative group rounded-xl overflow-hidden"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-90 group-hover:opacity-100 transition-opacity" />
      <div class="relative p-6 text-white">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <UserGroupIcon class="w-6 h-6" />
          </div>
          <div v-if="coachCount > 0" class="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
            {{ coachCount }} total
          </div>
        </div>
        <div class="text-3xl font-bold mb-1">{{ coachCount }}</div>
        <div class="text-white/90 font-medium">Coaches</div>
        <div class="text-white/70 text-sm mt-1">View all coaches</div>
      </div>
      <div class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </NuxtLink>

    <!-- Schools Card -->
    <NuxtLink
      v-if="showSchools"
      to="/schools"
      class="relative group rounded-xl overflow-hidden"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-90 group-hover:opacity-100 transition-opacity" />
      <div class="relative p-6 text-white">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <BuildingLibraryIcon class="w-6 h-6" />
          </div>
          <div v-if="schoolCount > 0" class="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
            {{ schoolCount }} total
          </div>
        </div>
        <div class="text-3xl font-bold mb-1">{{ schoolCount }}</div>
        <div class="text-white/90 font-medium">Schools</div>
        <div class="text-white/70 text-sm mt-1">Manage schools</div>
      </div>
      <div class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </NuxtLink>

    <!-- Interactions Card -->
    <NuxtLink
      v-if="showInteractions"
      to="/interactions"
      class="relative group rounded-xl overflow-hidden"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 opacity-90 group-hover:opacity-100 transition-opacity" />
      <div class="relative p-6 text-white">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <ChatBubbleLeftRightIcon class="w-6 h-6" />
          </div>
          <div v-if="interactionCount > 0" class="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
            {{ interactionCount }} logged
          </div>
        </div>
        <div class="text-3xl font-bold mb-1">{{ interactionCount }}</div>
        <div class="text-white/90 font-medium">Interactions</div>
        <div class="text-white/70 text-sm mt-1">Track interactions</div>
      </div>
      <div class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </NuxtLink>

    <!-- Offers Card -->
    <NuxtLink
      v-if="showOffers"
      to="/offers"
      class="relative group rounded-xl overflow-hidden"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 opacity-90 group-hover:opacity-100 transition-opacity" />
      <div class="relative p-6 text-white">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <GiftIcon class="w-6 h-6" />
          </div>
          <div v-if="totalOffers > 0" class="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
            {{ totalOffers - acceptedOffers }} pending
          </div>
        </div>
        <div class="text-3xl font-bold mb-1">{{ acceptedOffers }}/{{ totalOffers }}</div>
        <div class="text-white/90 font-medium">Offers</div>
        <div class="text-white/70 text-sm mt-1">Accepted / Total</div>
      </div>
      <div class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { UserGroupIcon, BuildingLibraryIcon, ChatBubbleLeftRightIcon, GiftIcon } from '@heroicons/vue/24/outline'

interface Props {
  coachCount: number
  schoolCount: number
  interactionCount: number
  totalOffers: number
  acceptedOffers: number
  showCoaches?: boolean
  showSchools?: boolean
  showInteractions?: boolean
  showOffers?: boolean
}

withDefaults(defineProps<Props>(), {
  showCoaches: true,
  showSchools: true,
  showInteractions: true,
  showOffers: true,
})
</script>
