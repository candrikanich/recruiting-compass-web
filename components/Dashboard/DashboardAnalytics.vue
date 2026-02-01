<template>
  <div class="space-y-6">
    <!-- Recruiting Packet Actions -->
    <div
      class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
    >
      <h3 class="text-slate-900 font-semibold mb-4">Recruiting Packet</h3>
      <div class="space-y-2">
        <button
          @click="emit('generate-packet')"
          :disabled="recruitingPacketLoading"
          class="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
          :class="
            recruitingPacketLoading
              ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md'
          "
        >
          <svg
            v-if="!recruitingPacketLoading"
            class="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8l-4-2m4 2l4-2"
            />
          </svg>
          <svg
            v-else
            class="w-4 h-4 mr-2 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {{ recruitingPacketLoading ? "Generating..." : "Generate Packet" }}
        </button>

        <button
          @click="emit('email-packet')"
          :disabled="!hasGeneratedPacket || recruitingPacketLoading"
          class="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
          :class="
            !hasGeneratedPacket || recruitingPacketLoading
              ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-sm hover:shadow-md'
          "
        >
          <svg
            class="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Email to Coach
        </button>
      </div>
      <div
        v-if="recruitingPacketError"
        class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
      >
        {{ recruitingPacketError }}
      </div>
    </div>

    <!-- Schools by Size -->
    <div
      v-if="schoolCount > 0"
      class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
    >
      <h3 class="text-slate-900 font-semibold mb-4">Schools by Size</h3>
      <div class="space-y-3">
        <div
          v-for="size in [
            'Very Small',
            'Small',
            'Medium',
            'Large',
            'Very Large',
          ]"
          :key="size"
        >
          <div v-if="schoolSizeBreakdown[size] > 0">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-slate-700 text-sm">{{ size }}</span>
              <span class="text-slate-900 font-medium text-sm">{{
                schoolSizeBreakdown[size]
              }}</span>
            </div>
            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                :class="getSizeBarColor(size)"
                class="h-full transition-all duration-500"
                :style="{
                  width: `${(schoolSizeBreakdown[size] / schoolCount) * 100}%`,
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upcoming Events -->
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
          v-if="upcomingEvents.length > 0"
          class="px-3 py-1 bg-brand-blue-100 text-brand-blue-700 rounded-full text-sm font-medium"
        >
          {{ upcomingEvents.length }}
        </div>
      </div>
      <div v-if="upcomingEvents.length > 0" class="space-y-3">
        <div
          v-for="(event, index) in upcomingEvents.slice(0, 3)"
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

    <!-- Contact Frequency -->
    <ContactFrequencyWidget
      v-if="contactFrequencyInteractions && schools"
      :interactions="contactFrequencyInteractions"
      :schools="schools"
    />

    <!-- Quick Tasks -->
    <div
      v-if="showTasks"
      class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
    >
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md"
          >
            <CheckIcon class="w-5 h-5 text-white" />
          </div>
          <div class="flex items-center gap-2">
            <h3 class="text-slate-900 font-semibold">Quick Tasks</h3>
            <span
              v-if="pendingCount > 0"
              class="px-3 py-1 bg-brand-blue-100 text-brand-blue-700 rounded-full text-xs font-semibold"
            >
              {{ pendingCount }} pending
            </span>
          </div>
        </div>
        <button
          @click="showTaskForm = !showTaskForm"
          class="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-brand-blue-500 to-brand-blue-600 text-white rounded-lg text-sm font-medium hover:from-brand-blue-600 hover:to-brand-blue-700 transition-all"
        >
          <PlusIcon class="w-4 h-4" />
          Add Task
        </button>
      </div>

      <!-- Add Task Form -->
      <div
        v-if="showTaskForm"
        class="mb-4 p-3 rounded-xl border-2 border-brand-blue-500 bg-brand-blue-100"
      >
        <input
          v-model="newTask"
          type="text"
          placeholder="Enter task..."
          class="w-full bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 mb-2"
          @keyup.enter="handleAddTask"
          autofocus
        />
        <div class="flex gap-2 justify-end">
          <button
            @click="handleAddTask"
            class="px-3 py-1.5 text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-100 rounded transition-colors"
          >
            <CheckIcon class="w-4 h-4" />
          </button>
          <button
            @click="showTaskForm = false"
            class="px-3 py-1.5 text-slate-500 hover:text-slate-700 font-medium hover:bg-slate-200 rounded transition-colors"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Tasks List -->
      <div v-if="tasks.length > 0" class="space-y-2 max-h-48 overflow-y-auto">
        <div
          v-for="task in tasks"
          :key="task.id"
          :class="[
            'flex items-center gap-3 p-3 rounded-xl border-2 transition-all group',
            task.completed
              ? 'bg-slate-50 border-slate-200'
              : 'bg-white border-slate-200 hover:border-blue-300',
          ]"
        >
          <button
            @click="$emit('toggle-task', task.id)"
            :class="[
              'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0',
              task.completed
                ? 'bg-blue-500 border-blue-500'
                : 'border-slate-300 hover:border-blue-400',
            ]"
          >
            <CheckIcon v-if="task.completed" class="w-3 h-3 text-white" />
          </button>
          <span
            :class="[
              'flex-1 text-sm transition-all',
              task.completed ? 'text-slate-400 line-through' : 'text-slate-700',
            ]"
          >
            {{ task.text }}
          </span>
          <button
            @click="$emit('delete-task', task.id)"
            class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-all p-1 hover:bg-red-50 rounded"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-8 text-slate-500">
        <p class="text-sm mb-2">No tasks yet</p>
        <p class="text-xs text-slate-400">Click "Add Task" to get started</p>
      </div>

      <!-- Clear Completed -->
      <button
        v-if="completedCount > 0"
        @click="$emit('clear-completed')"
        class="mt-4 w-full py-2 text-slate-500 text-sm hover:text-slate-700 transition"
      >
        Clear {{ completedCount }} completed
      </button>
    </div>

    <!-- Recent Activity / Notifications -->
    <div
      v-if="showNotifications"
      class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
    >
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-slate-100 rounded-lg">
            <BellIcon class="w-5 h-5 text-slate-700" />
          </div>
          <h3 class="text-slate-900 font-semibold">Recent Activity</h3>
        </div>
        <button
          @click="$emit('refresh-notifications')"
          class="px-3 py-1 bg-brand-blue-100 text-brand-blue-700 rounded-full text-sm font-medium hover:bg-brand-blue-200 transition"
        >
          Refresh
        </button>
      </div>
      <div
        v-if="notifications.length > 0"
        class="space-y-3 max-h-64 overflow-y-auto"
      >
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'p-3 rounded-lg cursor-pointer transition-colors',
            notification.read_at
              ? 'bg-slate-50 hover:bg-slate-100'
              : 'bg-brand-blue-100 hover:bg-brand-blue-200',
          ]"
          @click="$emit('notification-click', notification)"
        >
          <div class="font-medium text-slate-900 text-sm">
            {{ notification.title }}
          </div>
          <div class="text-slate-600 text-sm mt-1 line-clamp-2">
            {{ notification.message }}
          </div>
          <div class="text-slate-400 text-xs mt-1">
            {{ formatNotificationDate(notification.scheduled_for) }}
          </div>
        </div>
      </div>
      <div v-else class="text-center py-6 text-slate-500">
        <p>No recent activity</p>
      </div>
      <NuxtLink
        to="/notifications"
        class="mt-4 block w-full py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 text-center"
      >
        View All Notifications
      </NuxtLink>
    </div>

    <!-- Social Media -->
    <div
      v-if="showSocial"
      class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 mt-6"
    >
      <div class="flex items-center gap-3 mb-5">
        <div class="p-2 bg-slate-100 rounded-lg">
          <ShareIcon class="w-5 h-5 text-slate-700" />
        </div>
        <h3 class="text-slate-900 font-semibold">Social Media</h3>
      </div>
      <div class="space-y-3">
        <div class="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
          <span class="text-2xl">🐦</span>
          <div class="flex-1">
            <div class="text-slate-700 font-medium">X (Twitter)</div>
            <div class="text-slate-500 text-sm">Monitor coach posts</div>
          </div>
        </div>
      </div>
      <NuxtLink
        to="/social"
        class="mt-4 block w-full py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 text-center"
      >
        Monitor Activity
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  CalendarDaysIcon,
  BellIcon,
  CheckIcon,
  PlusIcon,
  XMarkIcon,
  ShareIcon,
} from "@heroicons/vue/24/outline";
import type {
  Notification as NotificationModel,
  Interaction,
  School,
} from "~/types/models";
import ContactFrequencyWidget from "~/components/Dashboard/ContactFrequencyWidget.vue";

interface Event {
  id: string;
  name: string;
  start_date: string;
  location?: string | null;
}

type Notification = NotificationModel;

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface Props {
  upcomingEvents?: Event[];
  notifications?: Notification[];
  tasks?: Task[];
  contactFrequencyInteractions?: Interaction[];
  schools?: School[];
  schoolCount?: number;
  schoolSizeBreakdown?: Record<string, number>;
  recruitingPacketLoading?: boolean;
  recruitingPacketError?: string | null;
  hasGeneratedPacket?: boolean;
  showEvents?: boolean;
  showNotifications?: boolean;
  showTasks?: boolean;
  showSocial?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  upcomingEvents: () => [],
  notifications: () => [],
  tasks: () => [],
  contactFrequencyInteractions: () => [],
  schools: () => [],
  schoolCount: 0,
  schoolSizeBreakdown: () => ({}),
  recruitingPacketLoading: false,
  recruitingPacketError: null,
  hasGeneratedPacket: false,
  showEvents: true,
  showNotifications: true,
  showTasks: true,
  showSocial: true,
});

const emit = defineEmits<{
  "refresh-notifications": [];
  "notification-click": [notification: Notification];
  "add-task": [text: string];
  "toggle-task": [id: string];
  "delete-task": [id: string];
  "clear-completed": [];
  "generate-packet": [];
  "email-packet": [];
}>();

const showTaskForm = ref(false);
const newTask = ref("");

const handleAddTask = () => {
  if (newTask.value.trim()) {
    emit("add-task", newTask.value);
    newTask.value = "";
    showTaskForm.value = false;
  }
};

const pendingCount = computed(
  () => props.tasks.filter((t) => !t.completed).length,
);
const completedCount = computed(
  () => props.tasks.filter((t) => t.completed).length,
);

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

const formatNotificationDate = (date: string): string => {
  const now = new Date();
  const notifDate = new Date(date);
  const diffMs = now.getTime() - notifDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return notifDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const getSizeBarColor = (size: string): string => {
  const colors: Record<string, string> = {
    "Very Small": "bg-blue-500",
    Small: "bg-blue-400",
    Medium: "bg-blue-300",
    Large: "bg-orange-400",
    "Very Large": "bg-orange-500",
  };
  return colors[size] || "bg-slate-300";
};
</script>
