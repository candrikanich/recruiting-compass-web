<template>
  <div
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <h2 class="mb-6 text-xl font-bold text-slate-900">📅 Upcoming Events</h2>

    <!-- Empty State -->
    <div
      v-if="upcomingEvents.length === 0"
      class="py-8 text-center text-slate-600"
    >
      <p>No upcoming events scheduled</p>
      <NuxtLink
        to="/events"
        class="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
      >
        View all events →
      </NuxtLink>
    </div>

    <!-- Events Summary -->
    <div v-else class="space-y-6">
      <!-- Event Types Breakdown -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div class="rounded-lg bg-blue-50 p-3 text-center">
          <p class="text-2xl font-bold text-blue-600">
            {{ typeCount("showcase") }}
          </p>
          <p class="mt-1 text-xs text-slate-600">Showcases</p>
        </div>
        <div class="rounded-lg bg-emerald-50 p-3 text-center">
          <p class="text-2xl font-bold text-emerald-600">
            {{ typeCount("camp") }}
          </p>
          <p class="mt-1 text-xs text-slate-600">Camps</p>
        </div>
        <div class="rounded-lg bg-purple-50 p-3 text-center">
          <p class="text-2xl font-bold text-purple-600">
            {{ typeCount("official_visit") + typeCount("unofficial_visit") }}
          </p>
          <p class="mt-1 text-xs text-slate-600">Visits</p>
        </div>
        <div class="rounded-lg bg-orange-50 p-3 text-center">
          <p class="text-2xl font-bold text-orange-600">
            {{ typeCount("game") }}
          </p>
          <p class="mt-1 text-xs text-slate-600">Games</p>
        </div>
      </div>

      <!-- Next Events List -->
      <div class="border-t border-slate-200 pt-4">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">Next Events</h3>
        <div class="space-y-2">
          <div
            v-for="event in upcomingEvents.slice(0, 5)"
            :key="event.id"
            class="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-100 p-3 transition hover:bg-slate-200"
          >
            <div class="mt-0.5 text-lg">{{ getEventEmoji(event.type) }}</div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-slate-900">
                {{ event.name }}
              </p>
              <p class="text-xs text-slate-600">
                {{ getEventTypeLabel(event.type) }}
              </p>
              <p class="mt-1 text-xs text-slate-600">
                {{ formatDate(event.start_date) }}
              </p>
              <p v-if="event.location" class="text-xs text-slate-600">
                📍 {{ event.location }}
              </p>
            </div>
            <span
              class="mt-0.5 rounded-sm bg-blue-100 px-2 py-1 text-xs font-bold whitespace-nowrap text-blue-700"
            >
              {{ daysUntilDate(event.start_date) }}d
            </span>
          </div>
        </div>
      </div>

      <!-- View All Link -->
      <div class="pt-2 text-center">
        <NuxtLink
          to="/events"
          class="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all events →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Event } from "~/types/models";

interface Props {
  events: Event[];
}

const props = defineProps<Props>();

const upcomingEvents = computed(() => {
  const now = new Date();
  return props.events
    .filter((e) => new Date(e.start_date) >= now)
    .sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );
});

const typeCount = (type: string) => {
  return upcomingEvents.value.filter((e) => e.type === type).length;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const daysUntilDate = (dateString: string) => {
  const eventDate = new Date(dateString);
  const today = new Date();
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

const getEventEmoji = (type: string) => {
  const emojiMap: Record<string, string> = {
    showcase: "🎯",
    camp: "⛺",
    official_visit: "🏟️",
    unofficial_visit: "🏫",
    game: "🏟️",
  };
  return emojiMap[type] || "📅";
};

const getEventTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    showcase: "Showcase",
    camp: "Camp",
    official_visit: "Official Visit",
    unofficial_visit: "Unofficial Visit",
    game: "Game",
  };
  return labels[type] || type;
};
</script>
