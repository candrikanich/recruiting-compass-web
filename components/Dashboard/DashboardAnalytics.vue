<template>
  <div class="space-y-6">
    <!-- Recruiting Packet Actions -->
    <div
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
    >
      <h3 class="mb-4 font-semibold text-slate-900">Recruiting Packet</h3>
      <div class="space-y-2">
        <button
          @click="emit('generate-packet')"
          :disabled="recruitingPacketLoading"
          class="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
          :class="
            recruitingPacketLoading
              ? 'cursor-not-allowed bg-slate-100 text-slate-500'
              : 'bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-xs hover:from-blue-700 hover:to-blue-800 hover:shadow-md'
          "
        >
          <svg
            v-if="!recruitingPacketLoading"
            class="mr-2 h-4 w-4"
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
            class="mr-2 h-4 w-4 animate-spin"
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

        <NuxtLink
          to="/coaches"
          class="inline-flex w-full items-center justify-center rounded-lg bg-linear-to-r from-brand-emerald-600 to-brand-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:from-brand-emerald-700 hover:to-brand-emerald-800 hover:shadow-md"
        >
          <svg
            class="mr-2 h-4 w-4"
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
          Share with a coach
        </NuxtLink>
      </div>
      <div
        v-if="recruitingPacketError"
        class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
      >
        {{ recruitingPacketError }}
      </div>
    </div>

    <!-- Schools by Size -->
    <div
      v-if="schoolCount > 0"
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
    >
      <h3 class="mb-4 font-semibold text-slate-900">Schools by Size</h3>
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
            <div class="mb-1.5 flex items-center justify-between">
              <span class="text-sm text-slate-700">{{ size }}</span>
              <span class="text-sm font-medium text-slate-900">{{
                schoolSizeBreakdown[size]
              }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
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
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
    >
      <div class="mb-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-slate-100 p-2">
            <UIcon
              name="i-heroicons-calendar-days"
              class="h-5 w-5 text-slate-700"
              aria-hidden="true"
            />
          </div>
          <h3 class="font-semibold text-slate-900">Upcoming Events</h3>
        </div>
        <div
          v-if="upcomingEvents.length > 0"
          class="rounded-full bg-brand-blue-100 px-3 py-1 text-sm font-medium text-brand-blue-700"
        >
          {{ upcomingEvents.length }}
        </div>
      </div>
      <div v-if="upcomingEvents.length > 0" class="space-y-3">
        <div
          v-for="(event, index) in upcomingEvents.slice(0, 3)"
          :key="event.id"
          class="flex items-start gap-3 rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100"
        >
          <div
            :class="['mt-2 h-2 w-2 rounded-full', getEventDotColor(index)]"
          />
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

    <!-- Contact Frequency -->
    <ContactFrequencyWidget
      v-if="contactFrequencyInteractions && schools"
      :interactions="contactFrequencyInteractions"
      :schools="schools"
    />

    <!-- Quick Tasks -->
    <div
      v-if="showTasks"
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
    >
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-md"
          >
            <UIcon
              name="i-heroicons-check"
              class="h-5 w-5 text-white"
              aria-hidden="true"
            />
          </div>
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-slate-900">Quick Tasks</h3>
            <span
              v-if="pendingCount > 0"
              class="rounded-full bg-brand-blue-100 px-3 py-1 text-xs font-semibold text-brand-blue-700"
            >
              {{ pendingCount }} pending
            </span>
          </div>
        </div>
        <button
          @click="showTaskForm = !showTaskForm"
          class="flex items-center gap-2 rounded-lg bg-linear-to-r from-brand-blue-500 to-brand-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:from-brand-blue-600 hover:to-brand-blue-700"
        >
          <UIcon name="i-heroicons-plus" class="h-4 w-4" aria-hidden="true" />
          Add Task
        </button>
      </div>

      <!-- Add Task Form -->
      <div
        v-if="showTaskForm"
        class="mb-4 rounded-xl border-2 border-brand-blue-500 bg-brand-blue-100 p-3"
      >
        <input
          v-model="newTask"
          type="text"
          placeholder="Enter task..."
          class="mb-2 w-full border-none bg-transparent text-sm text-slate-700 outline-hidden placeholder:text-slate-400"
          @keyup.enter="handleAddTask"
          autofocus
        />
        <div class="flex justify-end gap-2">
          <button
            @click="handleAddTask"
            aria-label="Save task"
            class="rounded-sm px-3 py-1.5 font-medium text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
          >
            <UIcon
              name="i-heroicons-check"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
          <button
            @click="showTaskForm = false"
            aria-label="Cancel adding task"
            class="rounded-sm px-3 py-1.5 font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <UIcon
              name="i-heroicons-x-mark"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <!-- Tasks List -->
      <div v-if="tasks.length > 0" class="max-h-48 space-y-2 overflow-y-auto">
        <div
          v-for="task in tasks"
          :key="task.id"
          :class="[
            'group flex items-center gap-3 rounded-xl border-2 p-3 transition-all',
            task.completed
              ? 'border-slate-200 bg-slate-50'
              : 'border-slate-200 bg-white hover:border-blue-300',
          ]"
        >
          <button
            @click="$emit('toggle-task', task.id)"
            :aria-label="`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.text}`"
            :aria-pressed="task.completed"
            :class="[
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
              task.completed
                ? 'border-blue-500 bg-blue-500'
                : 'border-slate-300 hover:border-blue-400',
            ]"
          >
            <UIcon
              name="i-heroicons-check"
              v-if="task.completed"
              class="h-3 w-3 text-white"
              aria-hidden="true"
            />
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
            :aria-label="`Delete task: ${task.text}`"
            class="rounded-sm p-1 text-red-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
          >
            <UIcon
              name="i-heroicons-x-mark"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-8 text-center text-slate-500">
        <p class="mb-2 text-sm">No tasks yet</p>
        <p class="text-xs text-slate-400">Click "Add Task" to get started</p>
      </div>

      <!-- Clear Completed -->
      <button
        v-if="completedCount > 0"
        @click="$emit('clear-completed')"
        class="mt-4 w-full py-2 text-sm text-slate-500 transition hover:text-slate-700"
      >
        Clear {{ completedCount }} completed
      </button>
    </div>

    <!-- Recent Activity / Notifications -->
    <div
      v-if="showNotifications"
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
    >
      <div class="mb-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-slate-100 p-2">
            <UIcon
              name="i-heroicons-bell"
              class="h-5 w-5 text-slate-700"
              aria-hidden="true"
            />
          </div>
          <h3 class="font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <button
          @click="$emit('refresh-notifications')"
          class="rounded-full bg-brand-blue-100 px-3 py-1 text-sm font-medium text-brand-blue-700 transition hover:bg-brand-blue-200"
        >
          Refresh
        </button>
      </div>
      <div
        v-if="notifications.length > 0"
        class="max-h-64 space-y-3 overflow-y-auto"
      >
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'cursor-pointer rounded-lg p-3 transition-colors',
            notification.read_at
              ? 'bg-slate-50 hover:bg-slate-100'
              : 'bg-brand-blue-100 hover:bg-brand-blue-200',
          ]"
          @click="$emit('notification-click', notification)"
        >
          <div class="text-sm font-medium text-slate-900">
            {{ notification.title }}
          </div>
          <div class="mt-1 line-clamp-2 text-sm text-slate-600">
            {{ notification.message }}
          </div>
          <div class="mt-1 text-xs text-slate-400">
            {{ formatNotificationDate(notification.scheduled_for) }}
          </div>
        </div>
      </div>
      <div v-else class="py-6 text-center text-slate-500">
        <p>No recent activity</p>
      </div>
      <NuxtLink
        to="/notifications"
        class="mt-4 block w-full rounded-lg border border-slate-300 py-2 text-center text-slate-700 transition-colors hover:bg-slate-50"
      >
        View All Notifications
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
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
  showEvents?: boolean;
  showNotifications?: boolean;
  showTasks?: boolean;
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
  showEvents: true,
  showNotifications: true,
  showTasks: true,
});

const emit = defineEmits<{
  "refresh-notifications": [];
  "notification-click": [notification: Notification];
  "add-task": [text: string];
  "toggle-task": [id: string];
  "delete-task": [id: string];
  "clear-completed": [];
  "generate-packet": [];
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
