<template>
  <div class="relative">
    <!-- Notification Bell -->
    <button
      @click="isOpen = !isOpen"
      class="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
    >
      <svg
        class="w-6 h-6 text-slate-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <!-- Badge -->
      <span
        v-if="unreadCount > 0"
        class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
      >
        {{ Math.min(unreadCount, 9) }}
      </span>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 flex flex-col"
      >
        <!-- Header -->
        <div
          class="px-4 py-3 border-b border-slate-200 flex items-center justify-between"
        >
          <h3 class="font-semibold text-slate-900">Notifications</h3>
          <button
            v-if="notifications.length > 0"
            @click="markAllAsRead"
            class="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Mark all read
          </button>
        </div>

        <!-- Notifications List -->
        <div v-if="notifications.length > 0" class="overflow-y-auto flex-1">
          <button
            v-for="notification in notifications"
            :key="notification.id"
            @click="handleNotificationClick(notification)"
            :class="[
              'w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors',
              !notification.read_at ? 'bg-blue-50' : '',
            ]"
          >
            <div class="flex items-start gap-3">
              <div
                v-if="!notification.read_at"
                class="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-900">
                  {{ notification.title }}
                </p>
                <p class="text-sm text-slate-600 mt-0.5 line-clamp-2">
                  {{ notification.message }}
                </p>
                <p class="text-xs text-slate-400 mt-1">
                  {{ formatDate(notification.scheduled_for) }}
                </p>
              </div>
            </div>
          </button>
        </div>

        <!-- Empty State -->
        <div v-else class="flex items-center justify-center py-8">
          <p class="text-slate-500 text-sm">No notifications</p>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-200 px-4 py-3">
          <NuxtLink
            to="/notifications"
            @click="isOpen = false"
            class="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All Notifications
          </NuxtLink>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false" />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface Notification {
  id: string;
  title: string;
  message: string;
  scheduled_for: string;
  read_at?: string;
}

interface Props {
  notifications?: Notification[];
}

const props = withDefaults(defineProps<Props>(), {
  notifications: () => [],
});

const emit = defineEmits<{
  "notification-click": [notification: Notification];
  "mark-as-read": [id: string];
}>();

const isOpen = ref(false);

const unreadCount = computed(() => {
  return props.notifications.filter((n) => !n.read_at).length;
});

const handleNotificationClick = (notification: Notification) => {
  emit("notification-click", notification);
  if (!notification.read_at) {
    emit("mark-as-read", notification.id);
  }
  isOpen.value = false;
};

const markAllAsRead = () => {
  props.notifications.forEach((notification) => {
    if (!notification.read_at) {
      emit("mark-as-read", notification.id);
    }
  });
};

const formatDate = (date: string): string => {
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
</script>
