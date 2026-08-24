<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Notifications</h1>
          <p class="mt-1 text-gray-600">{{ unreadCount }} unread</p>
        </div>
        <div class="flex gap-2">
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Mark all as read
          </button>
          <button
            v-if="hasReadNotifications"
            @click="deleteAllRead"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Clear read
          </button>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-6">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search notifications..."
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Type Filter -->
      <div class="mb-6 flex flex-wrap gap-2">
        <button
          v-for="type in [
            'all',
            'follow_up_reminder',
            'deadline_alert',
            'inbound_interaction',
            'daily_digest',
            'offer',
            'event',
            'general',
          ]"
          :key="type"
          @click="activeFilter = type"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-semibold transition',
            activeFilter === type
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400',
          ]"
        >
          {{ getTypeLabel(type) }}
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-12 text-center">
        <p class="text-gray-600">Loading notifications...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredNotifications.length === 0"
        class="rounded-lg bg-white p-12 text-center shadow-sm"
      >
        <p class="mb-2 text-gray-600">No notifications</p>
        <p class="text-sm text-gray-500">You're all caught up!</p>
      </div>

      <!-- Notifications List -->
      <div v-else class="space-y-3">
        <div
          v-for="notification in filteredNotifications"
          :key="notification.id"
          data-testid="notification-card"
          :data-read="!!notification.read_at"
          :class="[
            'flex cursor-pointer items-start justify-between rounded-lg border-l-4 bg-white p-4 shadow-sm transition hover:shadow-lg',
            notification.read_at
              ? 'border-gray-300'
              : 'border-blue-500 bg-blue-50',
          ]"
          @click="handleNotificationClick(notification)"
        >
          <div class="flex-1">
            <div class="mb-1 flex items-center gap-2">
              <UIcon
                name="i-heroicons-bell"
                v-if="notification.type === 'follow_up_reminder'"
                class="h-5 w-5 text-blue-600"
              />
              <span
                v-else
                :class="['text-lg', getTypeIcon(notification.type)]"
                >{{ getTypeEmoji(notification.type) }}</span
              >
              <h3
                :class="[
                  'font-semibold',
                  notification.read_at ? 'text-gray-900' : 'text-blue-900',
                ]"
              >
                {{ notification.title }}
              </h3>
              <span
                v-if="notification.priority === 'high'"
                class="rounded-sm bg-red-100 px-2 py-1 text-xs font-bold text-red-700"
              >
                HIGH
              </span>
              <span
                v-else-if="notification.priority === 'normal'"
                class="rounded-sm bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700"
              >
                NORMAL
              </span>
              <span
                v-else
                class="rounded-sm bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700"
              >
                LOW
              </span>
            </div>
            <p
              :class="[
                'text-sm',
                notification.read_at ? 'text-gray-600' : 'text-gray-700',
              ]"
            >
              {{ notification.message }}
            </p>
            <p class="mt-2 text-xs text-gray-500">
              {{ formatDate(notification.scheduled_for) }}
            </p>
          </div>
          <button
            @click.stop="deleteNotification(notification.id)"
            class="ml-4 text-gray-400 transition hover:text-red-600"
          >
            <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useNotifications } from "~/composables/useNotifications";
import type { Notification } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const {
  notifications,
  loading,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} = useNotifications();

const activeFilter = ref("all");
const searchQuery = ref("");

const filteredNotifications = computed(() => {
  let filtered = notifications.value;

  if (activeFilter.value !== "all") {
    filtered = filtered.filter((n) => n.type === activeFilter.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query),
    );
  }

  return filtered;
});

const unreadCount = computed(
  () => notifications.value.filter((n) => !n.read_at).length,
);
const hasReadNotifications = computed(() =>
  notifications.value.some((n) => n.read_at),
);

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    all: "All",
    follow_up_reminder: "Follow-ups",
    follow_up: "Follow-ups",
    deadline_alert: "Deadlines",
    deadline: "Deadlines",
    offer: "Offers",
    event: "Events",
    daily_digest: "Digest",
    inbound_interaction: "Inbound",
    general: "General",
  };
  return labels[type] || type;
};

const getTypeEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    follow_up_reminder: "🔔",
    follow_up: "🔔",
    deadline_alert: "⏰",
    deadline: "⏰",
    offer: "🎉",
    event: "📅",
    daily_digest: "📊",
    inbound_interaction: "📧",
    general: "📬",
  };
  // Return empty string for follow_up types since they now use BellIcon
  if (type === "follow_up_reminder" || type === "follow_up") return "";
  return emojis[type] || "📬";
};

const getTypeIcon = (type: string): string => {
  return "inline-block";
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return "just now";
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const handleNotificationClick = async (notification: Notification) => {
  if (!notification.read_at) {
    await markAsRead(notification.id);
  }

  if (notification.action_url) {
    await navigateTo(notification.action_url);
  }
};

onMounted(async () => {
  await fetchNotifications();
});
</script>
