<template>
  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8"
  >
    <!-- Coaches Card -->
    <NuxtLink
      v-if="showCoaches"
      to="/coaches"
      class="relative group rounded-xl overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      :aria-label="`Coaches section: ${coachCount} total coaches. Navigate to manage all coaches.`"
    >
      <div
        class="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <UserGroupIcon class="w-6 h-6" aria-hidden="true" />
          </div>
          <div
            v-if="coachCount > 0"
            class="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm"
            aria-hidden="true"
          >
            {{ coachCount }} total
          </div>
        </div>
        <div class="text-3xl font-bold mb-1" aria-live="polite">
          {{ coachCount }}
        </div>
        <div class="text-white/90 font-medium">Coaches</div>
        <div class="text-white/70 text-sm mt-1">View all coaches</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>

    <!-- Schools Card -->
    <NuxtLink
      v-if="showSchools"
      to="/schools"
      class="relative group rounded-xl overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
      :aria-label="`Schools section: ${schoolCount} total schools. Navigate to manage schools.`"
    >
      <div
        class="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <BuildingLibraryIcon class="w-6 h-6" aria-hidden="true" />
          </div>
          <div
            v-if="schoolCount > 0"
            class="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm"
            aria-hidden="true"
          >
            {{ schoolCount }} total
          </div>
        </div>
        <div class="text-3xl font-bold mb-1" aria-live="polite">
          {{ schoolCount }}
        </div>
        <div class="text-white/90 font-medium">Schools</div>
        <div class="text-white/70 text-sm mt-1">Manage schools</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>

    <!-- Interactions Card -->
    <NuxtLink
      v-if="showInteractions"
      to="/interactions"
      class="relative group rounded-xl overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
      :aria-label="`Interactions section: ${interactionCount} logged interactions. Navigate to track interactions.`"
    >
      <div
        class="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <ChatBubbleLeftRightIcon class="w-6 h-6" aria-hidden="true" />
          </div>
          <div
            v-if="interactionCount > 0"
            class="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm"
            aria-hidden="true"
          >
            {{ interactionCount }} logged
          </div>
        </div>
        <div class="text-3xl font-bold mb-1" aria-live="polite">
          {{ interactionCount }}
        </div>
        <div class="text-white/90 font-medium">Interactions</div>
        <div class="text-white/70 text-sm mt-1">Track interactions</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>

    <!-- Offers Card -->
    <NuxtLink
      v-if="showOffers"
      to="/offers"
      class="relative group rounded-xl overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
      :aria-label="`Offers section: ${acceptedOffers} accepted out of ${totalOffers} total offers. Navigate to view all offers.`"
    >
      <div
        class="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <GiftIcon class="w-6 h-6" aria-hidden="true" />
          </div>
          <div
            v-if="totalOffers > 0"
            class="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm"
            aria-hidden="true"
          >
            {{ totalOffers - acceptedOffers }} pending
          </div>
        </div>
        <div class="text-3xl font-bold mb-1" aria-live="polite">
          {{ acceptedOffers }}/{{ totalOffers }}
        </div>
        <div class="text-white/90 font-medium">Offers</div>
        <div class="text-white/70 text-sm mt-1">Accepted / Total</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>

    <!-- A-tier Schools Card -->
    <NuxtLink
      v-if="showATier"
      data-testid="stat-card-a-tier"
      to="/schools?tier=A"
      class="relative group rounded-xl overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
      :aria-label="`A-tier schools: ${aTierSchoolCount} priority schools. Navigate to view A-tier schools.`"
    >
      <div
        class="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <AcademicCapIcon class="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
        <div class="text-3xl font-bold mb-1" aria-live="polite">
          {{ aTierSchoolCount }}
        </div>
        <div class="text-white/90 font-medium">A-tier</div>
        <div class="text-white/70 text-sm mt-1">Priority schools</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>

    <!-- Monthly Contacts Card -->
    <NuxtLink
      v-if="showMonthlyContacts"
      data-testid="stat-card-monthly-contacts"
      to="/interactions"
      class="relative group rounded-xl overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
      :aria-label="`Monthly contacts: ${contactsThisMonth} contacts this month. Navigate to view interaction history.`"
    >
      <div
        class="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <CalendarIcon class="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
        <div class="text-3xl font-bold mb-1" aria-live="polite">
          {{ contactsThisMonth }}
        </div>
        <div class="text-white/90 font-medium">Contacts</div>
        <div class="text-white/70 text-sm mt-1">This month</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import {
  UserGroupIcon,
  BuildingLibraryIcon,
  ChatBubbleLeftRightIcon,
  GiftIcon,
  AcademicCapIcon,
  CalendarIcon,
} from "@heroicons/vue/24/outline";

interface Props {
  coachCount: number;
  schoolCount: number;
  interactionCount: number;
  totalOffers: number;
  acceptedOffers: number;
  aTierSchoolCount: number;
  contactsThisMonth: number;
  showCoaches?: boolean;
  showSchools?: boolean;
  showInteractions?: boolean;
  showOffers?: boolean;
  showATier?: boolean;
  showMonthlyContacts?: boolean;
}

withDefaults(defineProps<Props>(), {
  showCoaches: true,
  showSchools: true,
  showInteractions: true,
  showOffers: true,
  showATier: true,
  showMonthlyContacts: true,
});
</script>
