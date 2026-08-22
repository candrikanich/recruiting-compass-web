<template>
  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8"
  >
    <!-- Schools Card -->
    <NuxtLink
      v-if="showSchools"
      to="/schools"
      class="relative group rounded-xl overflow-hidden transition-all focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
      :aria-label="`Schools section: ${schoolCount} total schools. Navigate to manage schools.`"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-purple-500 to-purple-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-center gap-3 mb-2">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-xs">
            <UIcon
              name="i-heroicons-building-library"
              class="w-6 h-6"
              aria-hidden="true"
            />
          </div>
          <div class="text-3xl font-bold" aria-live="polite">
            {{ schoolCount }}
          </div>
        </div>
        <div class="text-white/90 font-medium">Schools</div>
        <div class="text-white/70 text-sm mt-1">Manage schools</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>

    <!-- Coaches Card -->
    <NuxtLink
      v-if="showCoaches"
      to="/coaches"
      class="relative group rounded-xl overflow-hidden transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      :aria-label="`Coaches section: ${coachCount} total coaches. Navigate to manage all coaches.`"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-blue-500 to-blue-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-center gap-3 mb-2">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-xs">
            <UIcon
              name="i-heroicons-user-group"
              class="w-6 h-6"
              aria-hidden="true"
            />
          </div>
          <div class="text-3xl font-bold" aria-live="polite">
            {{ coachCount }}
          </div>
        </div>
        <div class="text-white/90 font-medium">Coaches</div>
        <div class="text-white/70 text-sm mt-1">View all coaches</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>

    <!-- Interactions Card -->
    <NuxtLink
      v-if="showInteractions"
      to="/interactions"
      class="relative group rounded-xl overflow-hidden transition-all focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
      :aria-label="`Interactions section: ${interactionCount} logged interactions. Navigate to track interactions.`"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-emerald-500 to-emerald-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-center gap-3 mb-2">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-xs">
            <UIcon
              name="i-heroicons-chat-bubble-left-right"
              class="w-6 h-6"
              aria-hidden="true"
            />
          </div>
          <div class="text-3xl font-bold" aria-live="polite">
            {{ interactionCount }}
          </div>
        </div>
        <div class="text-white/90 font-medium">Interactions</div>
        <div class="text-white/70 text-sm mt-1">Track interactions</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>

    <!-- Events Card -->
    <NuxtLink
      v-if="showEvents"
      data-testid="stat-card-events"
      to="/events"
      class="relative group rounded-xl overflow-hidden transition-all focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
      :aria-label="`Events section: ${eventCount} entered events. Navigate to view all events.`"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-amber-500 to-amber-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-center gap-3 mb-2">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-xs">
            <UIcon
              name="i-heroicons-trophy"
              class="w-6 h-6"
              aria-hidden="true"
            />
          </div>
          <div class="text-3xl font-bold" aria-live="polite">
            {{ eventCount }}
          </div>
        </div>
        <div class="text-white/90 font-medium">Events</div>
        <div class="text-white/70 text-sm mt-1">Entered events</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>

    <!-- Offers Card -->
    <NuxtLink
      v-if="showOffers"
      to="/offers"
      class="relative group rounded-xl overflow-hidden transition-all focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
      :aria-label="`Offers section: ${acceptedOffers} accepted out of ${totalOffers} total offers. Navigate to view all offers.`"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-orange-500 to-orange-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-white/20 rounded-lg backdrop-blur-xs">
              <UIcon
                name="i-heroicons-gift"
                class="w-6 h-6"
                aria-hidden="true"
              />
            </div>
            <div class="text-3xl font-bold" aria-live="polite">
              {{ acceptedOffers }}/{{ totalOffers }}
            </div>
          </div>
          <div
            v-if="totalOffers > 0"
            class="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-xs"
            aria-hidden="true"
          >
            {{ totalOffers - acceptedOffers }} pending
          </div>
        </div>
        <div class="text-white/90 font-medium">Offers</div>
        <div class="text-white/70 text-sm mt-1">Accepted / Total</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>

    <!-- Last Contact Card -->
    <NuxtLink
      v-if="showLastContact"
      data-testid="stat-card-last-contact"
      to="/interactions"
      class="relative group rounded-xl overflow-hidden transition-all focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
      :aria-label="lastContactAriaLabel"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-teal-500 to-teal-600 opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
      />
      <div class="relative p-6 text-white">
        <div class="flex items-center gap-3 mb-2">
          <div class="p-3 bg-white/20 rounded-lg backdrop-blur-xs">
            <UIcon
              name="i-heroicons-clock"
              class="w-6 h-6"
              aria-hidden="true"
            />
          </div>
          <div class="text-3xl font-bold" aria-live="polite">
            {{ lastContactValue }}
          </div>
        </div>
        <div class="text-white/90 font-medium">Last Contact</div>
        <div class="text-white/70 text-sm mt-1">{{ lastContactCaption }}</div>
      </div>
      <div
        class="absolute inset-0 rounded-xl ring-2 ring-white/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none"
      />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  coachCount: number;
  schoolCount: number;
  interactionCount: number;
  totalOffers: number;
  acceptedOffers: number;
  eventCount: number;
  daysSinceLastContact: number | null;
  showCoaches?: boolean;
  showSchools?: boolean;
  showInteractions?: boolean;
  showOffers?: boolean;
  showEvents?: boolean;
  showLastContact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showCoaches: true,
  showSchools: true,
  showInteractions: true,
  showOffers: true,
  showEvents: true,
  showLastContact: true,
});

const lastContactValue = computed(() => {
  if (props.daysSinceLastContact === null) return "—";
  if (props.daysSinceLastContact === 0) return "Today";
  return String(props.daysSinceLastContact);
});

const lastContactCaption = computed(() => {
  if (props.daysSinceLastContact === null) return "No contact yet";
  if (props.daysSinceLastContact === 0) return "Most recent outreach";
  return props.daysSinceLastContact === 1 ? "day ago" : "days ago";
});

const lastContactAriaLabel = computed(() => {
  if (props.daysSinceLastContact === null) {
    return "Last contact: no interactions logged yet. Navigate to view interaction history.";
  }
  if (props.daysSinceLastContact === 0) {
    return "Last contact: today. Navigate to view interaction history.";
  }
  const unit = props.daysSinceLastContact === 1 ? "day" : "days";
  return `Last contact: ${props.daysSinceLastContact} ${unit} ago. Navigate to view interaction history.`;
});
</script>
