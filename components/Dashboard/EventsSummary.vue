<template>
  <div
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <h2 class="text-xl font-bold mb-6 text-slate-900">📅 Upcoming Events</h2>

    <!-- Empty State -->
    <div
      v-if="upcomingEvents.length === 0"
      class="text-center py-8 text-slate-600"
    >
      <p>No upcoming events scheduled</p>
      <NuxtLink
        to="/events"
        class="text-sm mt-2 inline-block text-blue-600 hover:text-blue-700"
      >
        View all events →
      </NuxtLink>
    </div>

    <!-- Events Summary -->
    <div v-else class="space-y-6">
      <!-- Event Types Breakdown -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="rounded-lg p-3 text-center bg-blue-50">
          <p class="text-2xl font-bold text-blue-600">
            {{ typeCount("showcase") }}
          </p>
          <p class="text-xs mt-1 text-slate-600">Showcases</p>
        </div>
        <div class="rounded-lg p-3 text-center bg-emerald-50">
          <p class="text-2xl font-bold text-emerald-600">
            {{ typeCount("camp") }}
          </p>
          <p class="text-xs mt-1 text-slate-600">Camps</p>
        </div>
        <div class="rounded-lg p-3 text-center bg-purple-50">
          <p class="text-2xl font-bold text-purple-600">
            {{ typeCount("official_visit") + typeCount("unofficial_visit") }}
          </p>
          <p class="text-xs mt-1 text-slate-600">Visits</p>
        </div>
        <div class="rounded-lg p-3 text-center bg-orange-50">
          <p class="text-2xl font-bold text-orange-600">
            {{ typeCount("game") }}
          </p>
          <p class="text-xs mt-1 text-slate-600">Games</p>
        </div>
      </div>

      <!-- Next Events List -->
      <div class="pt-4 border-t border-slate-200">
        <h3 class="text-sm font-semibold mb-3 text-slate-900">Next Events</h3>
        <div class="space-y-2">
          <div
            v-for="event in upcomingEvents.slice(0, 5)"
            :key="event.id"
            class="flex items-start gap-3 p-3 rounded-lg transition bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            <div class="text-lg mt-0.5">{{ getEventEmoji(event.type) }}</div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold truncate text-slate-900">
                {{ event.name }}
              </p>
              <p class="text-xs text-slate-600">
                {{ getEventTypeLabel(event.type) }}
              </p>
              <p class="text-xs mt-1 text-slate-600">
                {{ formatDate(event.start_date) }}
              </p>
              <p v-if="event.location" class="text-xs text-slate-600">
                📍 {{ event.location }}
              </p>
            </div>
            <span
              class="text-xs font-bold px-2 py-1 rounded whitespace-nowrap mt-0.5 bg-blue-100 text-blue-700"
            >
              {{ daysUntilDate(event.start_date) }}d
            </span>
          </div>
        </div>
      </div>

      <!-- View All Link -->
      <div class="text-center pt-2">
        <NuxtLink
          to="/events"
          class="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
    game: "⚾",
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
