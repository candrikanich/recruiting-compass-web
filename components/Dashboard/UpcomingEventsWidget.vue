<template>
  <div
    v-if="showEvents"
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-slate-100 rounded-lg">
          <CalendarDaysIcon class="w-5 h-5 text-slate-700" />
        </div>
        <h3 class="text-slate-900 font-semibold">Upcoming Events</h3>
      </div>
      <div
        v-if="events.length > 0"
        class="px-3 py-1 bg-brand-blue-100 text-brand-blue-700 rounded-full text-sm font-medium"
      >
        {{ events.length }}
      </div>
    </div>
    <div v-if="events.length > 0" class="space-y-3">
      <div
        v-for="(event, index) in events.slice(0, 3)"
        :key="event.id"
        class="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div
          :class="['w-2 h-2 rounded-full mt-2', getEventDotColor(index)]"
        />
        <div class="flex-1 min-w-0">
          <div class="text-slate-900 font-medium truncate">
            {{ event.name }}
          </div>
          <div class="text-slate-600 text-sm mt-0.5">
            {{ formatEventDate(event.start_date) }}
          </div>
          <div v-if="event.location" class="text-slate-500 text-sm truncate">
            {{ event.location }}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-6 text-slate-500">
      <p>No upcoming events</p>
    </div>
    <NuxtLink
      to="/events"
      class="mt-4 block w-full py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 text-center"
    >
      View All Events
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { CalendarDaysIcon } from "@heroicons/vue/24/outline";

interface Event {
  id: string;
  name: string;
  start_date: string;
  location?: string | null;
}

interface Props {
  events?: Event[];
  showEvents?: boolean;
}

withDefaults(defineProps<Props>(), {
  events: () => [],
  showEvents: true,
});

const getEventDotColor = (index: number): string => {
  const colors = ["bg-blue-500", "bg-purple-500", "bg-orange-500"];
  return colors[index % colors.length];
};

const formatEventDate = (date: string): string => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};
</script>
