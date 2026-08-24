<template>
  <div class="relative">
    <!-- Bell Icon Button -->
    <button
      @click="isOpen = !isOpen"
      class="relative p-2 text-gray-700 transition hover:text-blue-600"
      :aria-label="`Notifications (${unreadCount} unread)`"
    >
      <UIcon name="i-heroicons-bell-solid" class="h-6 w-6" />
      <span
        v-if="unreadCount > 0"
        class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
      >
        {{ unreadCount > 9 ? "9+" : unreadCount }}
      </span>
    </button>

    <!-- Dropdown Panel -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3"
        >
          <h3 class="font-semibold text-gray-900">Notifications</h3>
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Mark all read
          </button>
        </div>

        <!-- Notifications List -->
        <div class="max-h-96 overflow-y-auto">
          <div
            v-if="recentUnread.length === 0"
            class="px-4 py-8 text-center text-gray-500"
          >
            <p>All caught up! 🎉</p>
          </div>

          <div
            v-for="notification in recentUnread"
            :key="notification.id"
            class="border-b border-gray-100 last:border-b-0"
          >
            <button
              @click="handleNotificationClick(notification)"
              class="w-full px-4 py-3 text-left transition hover:bg-blue-50"
            >
              <div class="flex items-start gap-2">
                <UIcon
                  name="i-heroicons-bell-solid"
                  v-if="notification.type === 'follow_up_reminder'"
                  class="mt-0.5 h-5 w-5 shrink-0 text-blue-600"
                />
                <span v-else class="text-lg">{{
                  getNotificationEmoji(notification.type)
                }}</span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-gray-900">
                    {{ notification.title }}
                  </p>
                  <p class="mt-1 line-clamp-2 text-xs text-gray-600">
                    {{ notification.message }}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <NuxtLink
            to="/notifications"
            class="text-sm font-medium text-blue-600 hover:text-blue-700"
            @click="isOpen = false"
          >
            View all notifications →
          </NuxtLink>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isOpen"
          @click="isOpen = false"
          class="fixed inset-0 z-40"
          style="pointer-events: auto"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useNotifications } from "~/composables/useNotifications";
import type { Notification } from "~/types/models";

const isOpen = ref(false);
const { notifications, unreadCount, markAsRead, fetchNotifications } =
  useNotifications();

// Close dropdown when clicking outside
const recentUnread = computed(() => {
  const unread = notifications.value.filter((n) => !n.read_at);
  return unread.slice(0, 5);
});

const getNotificationEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    follow_up_reminder: "🔔",
    deadline_alert: "⏰",
    offer: "🎉",
    event: "📅",
    daily_digest: "📊",
    inbound_interaction: "📧",
  };
  // Return empty for follow_up_reminder since it'll use BellIcon in parent
  if (type === "follow_up_reminder") return "";
  return emojis[type] || "📬";
};

const markAllAsRead = async () => {
  const { markAllAsRead: markAll } = useNotifications();
  await markAll();
};

const handleNotificationClick = async (notification: Notification) => {
  if (!notification.read_at) {
    await markAsRead(notification.id);
  }
  isOpen.value = false;

  // Navigate to related entity if available
  if (notification.action_url) {
    await navigateTo(notification.action_url);
  }
};

onMounted(async () => {
  await fetchNotifications({ limit: 10 });
});

// Refresh notifications when dropdown opens
watch(isOpen, async (newVal) => {
  if (newVal) {
    await fetchNotifications({ limit: 10 });
  }
});
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
