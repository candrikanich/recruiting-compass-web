<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Notifications</h1>
          <p class="text-gray-600 mt-1">{{ unreadCount }} unread</p>
        </div>
        <div class="flex gap-2">
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Mark all as read
          </button>
          <button
            v-if="hasReadNotifications"
            @click="deleteAllRead"
            class="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition"
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
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <!-- Type Filter -->
      <div class="mb-6 flex gap-2 flex-wrap">
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
            'px-4 py-2 text-sm font-semibold rounded-lg transition',
            activeFilter === type
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400',
          ]"
        >
          {{ getTypeLabel(type) }}
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading notifications...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredNotifications.length === 0"
        class="bg-white rounded-lg shadow p-12 text-center"
      >
        <p class="text-gray-600 mb-2">No notifications</p>
        <p class="text-sm text-gray-500">You're all caught up!</p>
      </div>

      <!-- Notifications List -->
      <div v-else class="space-y-3">
        <div
          v-for="notification in filteredNotifications"
          :key="notification.id"
          :class="[
            'bg-white rounded-lg shadow p-4 hover:shadow-lg transition cursor-pointer border-l-4 flex items-start justify-between',
            notification.read_at
              ? 'border-gray-300'
              : 'border-blue-500 bg-blue-50',
          ]"
          @click="handleNotificationClick(notification)"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <BellIcon
                v-if="notification.type === 'follow_up_reminder'"
                class="w-5 h-5 text-blue-600"
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
                class="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded"
              >
                HIGH
              </span>
              <span
                v-else-if="notification.priority === 'normal'"
                class="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded"
              >
                NORMAL
              </span>
              <span
                v-else
                class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded"
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
            <p class="text-xs text-gray-500 mt-2">
              {{ formatDate(notification.scheduled_for) }}
            </p>
          </div>
          <button
            @click.stop="deleteNotification(notification.id)"
            class="ml-4 text-gray-400 hover:text-red-600 transition"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useNotifications } from "~/composables/useNotifications";
import { BellIcon, XMarkIcon } from "@heroicons/vue/24/outline";
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
