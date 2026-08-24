<template>
  <div
    class="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
  >
    <!-- Schools Card -->
    <NuxtLink
      v-if="showSchools"
      to="/schools"
      class="group relative overflow-hidden rounded-xl transition-all focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      :aria-label="`Schools section: ${schoolCount} total schools. Navigate to manage schools.`"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-purple-500 to-purple-600 opacity-90 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
      <div class="relative p-6 text-white">
        <div class="mb-2 flex items-center gap-3">
          <div class="rounded-lg bg-white/20 p-3 backdrop-blur-xs">
            <UIcon
              name="i-heroicons-building-library"
              class="h-6 w-6"
              aria-hidden="true"
            />
          </div>
          <div class="text-3xl font-bold" aria-live="polite">
            {{ schoolCount }}
          </div>
        </div>
        <div class="font-medium text-white/90">Schools</div>
        <div class="mt-1 text-sm text-white/70">Manage schools</div>
      </div>
      <div
        class="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-white/20 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
    </NuxtLink>

    <!-- Coaches Card -->
    <NuxtLink
      v-if="showCoaches"
      to="/coaches"
      class="group relative overflow-hidden rounded-xl transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      :aria-label="`Coaches section: ${coachCount} total coaches. Navigate to manage all coaches.`"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-blue-500 to-blue-600 opacity-90 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
      <div class="relative p-6 text-white">
        <div class="mb-2 flex items-center gap-3">
          <div class="rounded-lg bg-white/20 p-3 backdrop-blur-xs">
            <UIcon
              name="i-heroicons-user-group"
              class="h-6 w-6"
              aria-hidden="true"
            />
          </div>
          <div class="text-3xl font-bold" aria-live="polite">
            {{ coachCount }}
          </div>
        </div>
        <div class="font-medium text-white/90">Coaches</div>
        <div class="mt-1 text-sm text-white/70">View all coaches</div>
      </div>
      <div
        class="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-white/20 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
    </NuxtLink>

    <!-- Interactions Card -->
    <NuxtLink
      v-if="showInteractions"
      to="/interactions"
      class="group relative overflow-hidden rounded-xl transition-all focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      :aria-label="`Interactions section: ${interactionCount} logged interactions. Navigate to track interactions.`"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-emerald-500 to-emerald-600 opacity-90 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
      <div class="relative p-6 text-white">
        <div class="mb-2 flex items-center gap-3">
          <div class="rounded-lg bg-white/20 p-3 backdrop-blur-xs">
            <UIcon
              name="i-heroicons-chat-bubble-left-right"
              class="h-6 w-6"
              aria-hidden="true"
            />
          </div>
          <div class="text-3xl font-bold" aria-live="polite">
            {{ interactionCount }}
          </div>
        </div>
        <div class="font-medium text-white/90">Interactions</div>
        <div class="mt-1 text-sm text-white/70">Track interactions</div>
      </div>
      <div
        class="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-white/20 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
    </NuxtLink>

    <!-- Events Card -->
    <NuxtLink
      v-if="showEvents"
      data-testid="stat-card-events"
      to="/events"
      class="group relative overflow-hidden rounded-xl transition-all focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
      :aria-label="`Events section: ${eventCount} entered events. Navigate to view all events.`"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-amber-500 to-amber-600 opacity-90 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
      <div class="relative p-6 text-white">
        <div class="mb-2 flex items-center gap-3">
          <div class="rounded-lg bg-white/20 p-3 backdrop-blur-xs">
            <UIcon
              name="i-heroicons-trophy"
              class="h-6 w-6"
              aria-hidden="true"
            />
          </div>
          <div class="text-3xl font-bold" aria-live="polite">
            {{ eventCount }}
          </div>
        </div>
        <div class="font-medium text-white/90">Events</div>
        <div class="mt-1 text-sm text-white/70">Entered events</div>
      </div>
      <div
        class="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-white/20 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
    </NuxtLink>

    <!-- Offers Card -->
    <NuxtLink
      v-if="showOffers"
      to="/offers"
      class="group relative overflow-hidden rounded-xl transition-all focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      :aria-label="`Offers section: ${acceptedOffers} accepted out of ${totalOffers} total offers. Navigate to view all offers.`"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-orange-500 to-orange-600 opacity-90 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
      <div class="relative p-6 text-white">
        <div class="mb-2 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-white/20 p-3 backdrop-blur-xs">
              <UIcon
                name="i-heroicons-gift"
                class="h-6 w-6"
                aria-hidden="true"
              />
            </div>
            <div class="text-3xl font-bold" aria-live="polite">
              {{ acceptedOffers }}/{{ totalOffers }}
            </div>
          </div>
          <div
            v-if="totalOffers > 0"
            class="rounded-full bg-white/20 px-3 py-1 text-sm backdrop-blur-xs"
            aria-hidden="true"
          >
            {{ totalOffers - acceptedOffers }} pending
          </div>
        </div>
        <div class="font-medium text-white/90">Offers</div>
        <div class="mt-1 text-sm text-white/70">Accepted / Total</div>
      </div>
      <div
        class="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-white/20 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
    </NuxtLink>

    <!-- Last Contact Card -->
    <NuxtLink
      v-if="showLastContact"
      data-testid="stat-card-last-contact"
      to="/interactions"
      class="group relative overflow-hidden rounded-xl transition-all focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      :aria-label="lastContactAriaLabel"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-teal-500 to-teal-600 opacity-90 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      />
      <div class="relative p-6 text-white">
        <div class="mb-2 flex items-center gap-3">
          <div class="rounded-lg bg-white/20 p-3 backdrop-blur-xs">
            <UIcon
              name="i-heroicons-clock"
              class="h-6 w-6"
              aria-hidden="true"
            />
          </div>
          <div class="text-3xl font-bold" aria-live="polite">
            {{ lastContactValue }}
          </div>
        </div>
        <div class="font-medium text-white/90">Last Contact</div>
        <div class="mt-1 text-sm text-white/70">{{ lastContactCaption }}</div>
      </div>
      <div
        class="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-white/20 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
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
