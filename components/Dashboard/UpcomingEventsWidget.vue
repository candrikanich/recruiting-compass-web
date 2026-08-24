<template>
  <div
    v-if="showEvents"
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <div class="mb-5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="rounded-lg bg-slate-100 p-2">
          <UIcon
            name="i-heroicons-calendar-days"
            class="h-5 w-5 text-slate-700"
          />
        </div>
        <h3 class="font-semibold text-slate-900">Upcoming Events</h3>
      </div>
      <div
        v-if="events.length > 0"
        class="rounded-full bg-brand-blue-100 px-3 py-1 text-sm font-medium text-brand-blue-700"
      >
        {{ events.length }}
      </div>
    </div>
    <div v-if="events.length > 0" class="space-y-3">
      <div
        v-for="(event, index) in events.slice(0, 3)"
        :key="event.id"
        class="flex items-start gap-3 rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100"
      >
        <div :class="['mt-2 h-2 w-2 rounded-full', getEventDotColor(index)]" />
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium text-slate-900">
            {{ event.name }}
          </div>
          <div class="mt-0.5 text-sm text-slate-600">
            {{ formatEventDate(event.start_date) }}
          </div>
          <div v-if="event.location" class="truncate text-sm text-slate-500">
            {{ event.location }}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="py-6 text-center text-slate-500">
      <p>No upcoming events</p>
    </div>
    <NuxtLink
      to="/events"
      class="mt-4 block w-full rounded-lg border border-slate-300 py-2 text-center text-slate-700 transition-colors hover:bg-slate-50"
    >
      View All Events
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
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
