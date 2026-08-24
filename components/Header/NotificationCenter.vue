<template>
  <div class="relative">
    <!-- Notification Bell -->
    <button
      @click="isOpen = !isOpen"
      :aria-label="
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      "
      :aria-expanded="isOpen"
      aria-controls="notifications-dropdown"
      aria-haspopup="menu"
      class="relative rounded-lg p-2 transition-colors hover:bg-slate-100 focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
    >
      <svg
        class="h-6 w-6 text-slate-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
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
        aria-hidden="true"
        class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
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
        id="notifications-dropdown"
        role="menu"
        class="absolute right-0 z-50 mt-2 flex max-h-96 w-80 flex-col rounded-lg border border-slate-200 bg-white shadow-lg"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between border-b border-slate-200 px-4 py-3"
        >
          <h3 class="font-semibold text-slate-900">Notifications</h3>
          <button
            v-if="notifications.length > 0"
            @click="markAllAsRead"
            class="rounded-sm text-xs font-medium text-blue-600 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            Mark all read
          </button>
        </div>

        <!-- Notifications List -->
        <div v-if="notifications.length > 0" class="flex-1 overflow-y-auto">
          <button
            v-for="notification in notifications"
            :key="notification.id"
            role="menuitem"
            @click="handleNotificationClick(notification)"
            :class="[
              'w-full border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50',
              !notification.read_at ? 'bg-blue-50' : '',
            ]"
          >
            <div class="flex items-start gap-3">
              <div
                v-if="!notification.read_at"
                aria-hidden="true"
                class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-slate-900">
                  {{ notification.title }}
                </p>
                <p class="mt-0.5 line-clamp-2 text-sm text-slate-600">
                  {{ notification.message }}
                </p>
                <p class="mt-1 text-xs text-slate-400">
                  {{ formatDate(notification.scheduled_for) }}
                </p>
              </div>
            </div>
          </button>
        </div>

        <!-- Empty State -->
        <div v-else class="flex items-center justify-center py-8">
          <p class="text-sm text-slate-500">No notifications</p>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-200 px-4 py-3">
          <NuxtLink
            to="/notifications"
            @click="isOpen = false"
            class="block text-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View All Notifications
          </NuxtLink>
        </div>
      </div>
    </Transition>

    <!-- Backdrop (dismiss on outside click). NOT teleported to body: the app
         root (#__nuxt) has `isolation: isolate`, creating a stacking context.
         Teleporting the backdrop to <body> put it OUTSIDE that context at z-40,
         above the whole app — including this panel (trapped inside #__nuxt via
         the sticky z-50 header) — so it swallowed clicks on the notification
         items and links (panel closed, action never fired). Kept in-context,
         panel z-50 > backdrop z-40 as intended. -->
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
