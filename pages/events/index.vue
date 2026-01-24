<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Timeline Status Snippet -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
      <StatusSnippet context="events" />
    </div>

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div class="flex items-center justify-between">
          <h1
            data-testid="page-title"
            class="text-2xl font-bold text-slate-900"
          >
            Events
          </h1>
          <p class="text-slate-600 mt-1">
            Track camps, showcases, visits, and games
          </p>
        </div>
        <NuxtLink
          to="/events/create"
          data-testid="add-event-button"
          class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
        >
          <PlusIcon class="w-5 h-5" />
          Add Event
        </NuxtLink>
      </div>
    </div>

    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <!-- Filters Card -->
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2"
              >Search</label
            >
            <div class="relative">
              <MagnifyingGlassIcon
                class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Event name, location..."
                class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- Type Filter -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2"
              >Type</label
            >
            <select
              v-model="typeFilter"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- All --</option>
              <option value="camp">Camp</option>
              <option value="showcase">Showcase</option>
              <option value="official_visit">Official Visit</option>
              <option value="unofficial_visit">Unofficial Visit</option>
              <option value="game">Game</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2"
              >Status</label
            >
            <select
              v-model="statusFilter"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- All --</option>
              <option value="registered">Registered</option>
              <option value="not_registered">Not Registered</option>
              <option value="attended">Attended</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Date Range Filter -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2"
              >Date Range</label
            >
            <select
              v-model="dateRangeFilter"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- All --</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="this_month">This Month</option>
              <option value="next_month">Next Month</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Results Count and Sort -->
      <div class="flex items-center justify-between mb-6">
        <div class="text-slate-600">{{ filteredEvents.length }} results</div>
        <div class="w-64">
          <label class="block text-sm font-medium text-slate-700 mb-2"
            >Sort By</label
          >
          <select
            v-model="sortBy"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="date_desc">Date (Newest First)</option>
            <option value="date_asc">Date (Oldest First)</option>
            <option value="name">Name (A-Z)</option>
            <option value="type">Type (A-Z)</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && events.length === 0" class="text-center py-12">
        <p class="text-slate-600">Loading events...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="events.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <CalendarIcon class="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p class="text-slate-600 mb-2">No events yet</p>
        <p class="text-sm text-slate-500">
          Create your first event to start tracking camps and showcases
        </p>
      </div>

      <div v-else>
        <!-- Calendar View -->
        <div
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
        >
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-slate-900">Calendar</h2>
            <div class="flex items-center gap-2">
              <button
                @click="previousMonth"
                class="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronLeftIcon class="w-5 h-5" />
              </button>
              <span
                class="px-4 py-1 font-semibold text-slate-900 min-w-[160px] text-center"
              >
                {{ monthDisplay }}
              </span>
              <button
                @click="nextMonth"
                class="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronRightIcon class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Calendar Grid -->
          <div class="grid grid-cols-7 gap-1">
            <!-- Day Headers -->
            <div
              v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
              :key="day"
              class="text-center font-medium text-slate-500 text-sm py-2"
            >
              {{ day }}
            </div>

            <!-- Calendar Days -->
            <div
              v-for="date of calendarDays"
              :key="date.toISOString()"
              :class="[
                'p-2 rounded-lg text-sm font-medium transition min-h-[48px] flex flex-col items-center justify-center',
                {
                  'text-slate-300': !isCurrentMonth(date),
                  'text-slate-700 hover:bg-slate-50':
                    isCurrentMonth(date) && !hasEvent(date) && !isToday(date),
                  'bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100':
                    isCurrentMonth(date) && hasEvent(date) && !isToday(date),
                  'bg-blue-600 text-white': isToday(date),
                },
              ]"
              @click="hasEvent(date) && scrollToEvent(date)"
            >
              <span>{{ date.getDate() }}</span>
              <span
                v-if="hasEvent(date) && isCurrentMonth(date)"
                class="w-1.5 h-1.5 rounded-full mt-1"
                :class="isToday(date) ? 'bg-white' : 'bg-blue-500'"
              />
            </div>
          </div>
        </div>

        <!-- Events List -->
        <div class="space-y-4">
          <div
            v-for="event in sortedEvents"
            :key="event.id"
            :id="`event-${event.start_date}`"
            class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition"
          >
            <!-- Event Header -->
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full"
                      :class="getEventTypeBadgeColor(event.type)"
                    >
                      <component
                        :is="getEventTypeIcon(event.type)"
                        class="w-3.5 h-3.5"
                      />
                      {{ getEventTypeLabel(event.type) }}
                    </span>
                    <span
                      class="px-2 py-1 text-xs font-semibold rounded-full"
                      :class="getStatusBadgeColor(event)"
                    >
                      {{ getStatusLabel(event) }}
                    </span>
                  </div>
                  <h3 class="text-xl font-bold text-slate-900">
                    {{ event.name }}
                  </h3>
                  <p class="text-slate-600 mt-1">
                    {{ formatDateRange(event.start_date, event.end_date) }}
                  </p>
                </div>
                <button
                  @click="deleteEvent(event.id)"
                  class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <TrashIcon class="w-5 h-5" />
                </button>
              </div>

              <!-- Event Details Grid -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div v-if="event.start_time" class="flex items-center gap-2">
                  <ClockIcon class="w-4 h-4 text-slate-400" />
                  <div>
                    <p class="text-xs text-slate-500">Start Time</p>
                    <p class="font-medium text-slate-900">
                      {{ event.start_time }}
                    </p>
                  </div>
                </div>
                <div v-if="event.cost" class="flex items-center gap-2">
                  <CurrencyDollarIcon class="w-4 h-4 text-slate-400" />
                  <div>
                    <p class="text-xs text-slate-500">Cost</p>
                    <p class="font-medium text-slate-900">
                      ${{ event.cost.toFixed(2) }}
                    </p>
                  </div>
                </div>
                <div
                  v-if="event.address || event.city"
                  class="flex items-center gap-2"
                >
                  <MapPinIcon class="w-4 h-4 text-slate-400" />
                  <div>
                    <p class="text-xs text-slate-500">Location</p>
                    <p class="font-medium text-slate-900">
                      {{ event.city || event.address
                      }}{{ event.state ? `, ${event.state}` : "" }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Performance Notes (if any) -->
            <div
              v-if="event.performance_notes || event.description"
              class="border-t border-slate-200 px-6 py-4 bg-slate-50"
            >
              <p class="text-sm text-slate-700 line-clamp-2">
                {{ event.performance_notes || event.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Empty Filtered State -->
        <div
          v-if="filteredEvents.length === 0 && events.length > 0"
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
        >
          <FunnelIcon class="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p class="text-slate-600 mb-2">No events match your filters</p>
          <button
            @click="clearFilters"
            class="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Clear filters
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useEvents } from "~/composables/useEvents";
import StatusSnippet from "~/components/Timeline/StatusSnippet.vue";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  FunnelIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  TrophyIcon,
  TicketIcon,
} from "@heroicons/vue/24/outline";
import type { Event } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const {
  events,
  loading,
  fetchEvents,
  deleteEvent: deleteEventAPI,
} = useEvents();

const currentMonth = ref(new Date());
const sortBy = ref("date_desc");
const searchQuery = ref("");
const typeFilter = ref("");
const statusFilter = ref("");
const dateRangeFilter = ref("");

const filteredEvents = computed(() => {
  let result = [...events.value];

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.address?.toLowerCase().includes(query) ||
        e.city?.toLowerCase().includes(query),
    );
  }

  // Type filter
  if (typeFilter.value) {
    result = result.filter((e) => e.type === typeFilter.value);
  }

  // Status filter
  if (statusFilter.value === "attended") {
    result = result.filter((e) => e.attended);
  } else if (statusFilter.value === "registered") {
    result = result.filter((e) => e.registered && !e.attended);
  } else if (statusFilter.value === "not_registered") {
    result = result.filter((e) => !e.registered && !e.attended);
  }

  // Date range filter
  if (dateRangeFilter.value) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    result = result.filter((e) => {
      const eventDate = new Date(e.start_date);
      eventDate.setHours(0, 0, 0, 0);

      if (dateRangeFilter.value === "upcoming") return eventDate >= today;
      if (dateRangeFilter.value === "past") return eventDate < today;
      if (dateRangeFilter.value === "this_month") {
        return (
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getFullYear() === today.getFullYear()
        );
      }
      if (dateRangeFilter.value === "next_month") {
        const nextMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1,
        );
        return (
          eventDate.getMonth() === nextMonth.getMonth() &&
          eventDate.getFullYear() === nextMonth.getFullYear()
        );
      }
      return true;
    });
  }

  // Sorting
  result.sort((a, b) => {
    if (sortBy.value === "date_asc") {
      return (
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
    } else if (sortBy.value === "type") {
      return a.type.localeCompare(b.type);
    } else if (sortBy.value === "name") {
      return a.name.localeCompare(b.name);
    } else {
      return (
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );
    }
  });

  return result;
});

const sortedEvents = computed(() => filteredEvents.value);

const clearFilters = () => {
  searchQuery.value = "";
  typeFilter.value = "";
  statusFilter.value = "";
  dateRangeFilter.value = "";
};

// Calendar functions
const monthDisplay = computed(() => {
  return currentMonth.value.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
});

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days: Date[] = [];
  const current = new Date(startDate);

  while (days.length < 42) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
});

const isCurrentMonth = (date: Date): boolean => {
  return (
    date.getMonth() === currentMonth.value.getMonth() &&
    date.getFullYear() === currentMonth.value.getFullYear()
  );
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const hasEvent = (date: Date): boolean => {
  const dateStr = date.toISOString().split("T")[0];
  return events.value.some((e) => e.start_date === dateStr);
};

const previousMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1,
  );
};

const nextMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1,
  );
};

const scrollToEvent = (date: Date) => {
  const dateStr = date.toISOString().split("T")[0];
  const element = document.getElementById(`event-${dateStr}`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const getEventTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    showcase: "Showcase",
    camp: "Camp",
    official_visit: "Official Visit",
    unofficial_visit: "Unofficial Visit",
    game: "Game",
  };
  return labels[type] || type;
};

const getEventTypeBadgeColor = (type: string): string => {
  const colors: Record<string, string> = {
    showcase: "bg-purple-100 text-purple-700",
    camp: "bg-emerald-100 text-emerald-700",
    official_visit: "bg-blue-100 text-blue-700",
    unofficial_visit: "bg-sky-100 text-sky-700",
    game: "bg-orange-100 text-orange-700",
  };
  return colors[type] || "bg-slate-100 text-slate-700";
};

const getEventTypeIcon = (type: string) => {
  const icons: Record<string, any> = {
    showcase: TrophyIcon,
    camp: AcademicCapIcon,
    official_visit: BuildingOfficeIcon,
    unofficial_visit: BuildingOfficeIcon,
    game: TicketIcon,
  };
  return icons[type] || CalendarIcon;
};

const getStatusLabel = (event: Event): string => {
  if (event.attended) return "Attended";
  if (event.registered) return "Registered";
  return "Not Registered";
};

const getStatusBadgeColor = (event: Event): string => {
  if (event.attended) return "bg-emerald-100 text-emerald-700";
  if (event.registered) return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
};

const formatDateRange = (
  startDate: string,
  endDate?: string | null,
): string => {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const startStr = new Date(
    startYear,
    startMonth - 1,
    startDay,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!endDate || endDate === startDate) return startStr;
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const endStr = new Date(endYear, endMonth - 1, endDay).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
  return `${startStr} - ${endStr}`;
};

const deleteEvent = async (eventId: string) => {
  if (confirm("Are you sure you want to delete this event?")) {
    try {
      await deleteEventAPI(eventId);
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }
};

onMounted(async () => {
  await fetchEvents();
});
</script>
