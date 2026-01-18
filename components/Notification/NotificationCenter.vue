<template>
  <div class="relative">
    <!-- Bell Icon Button -->
    <button
      @click="isOpen = !isOpen"
      class="relative p-2 text-gray-700 hover:text-blue-600 transition"
      :aria-label="`Notifications (${unreadCount} unread)`"
    >
      <BellIcon class="w-6 h-6" />
      <span v-if="unreadCount > 0" class="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown Panel -->
    <Transition name="dropdown">
      <div v-if="isOpen" class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 overflow-hidden">
        <!-- Header -->
        <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">Notifications</h3>
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Mark all read
          </button>
        </div>

        <!-- Notifications List -->
        <div class="max-h-96 overflow-y-auto">
          <div v-if="recentUnread.length === 0" class="px-4 py-8 text-center text-gray-500">
            <p>All caught up! 🎉</p>
          </div>

          <div v-for="notification in recentUnread" :key="notification.id" class="border-b border-gray-100 last:border-b-0">
            <button
              @click="handleNotificationClick(notification)"
              class="w-full px-4 py-3 hover:bg-blue-50 transition text-left"
            >
              <div class="flex items-start gap-2">
                <BellIcon v-if="notification.type === 'follow_up_reminder'" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span v-else class="text-lg">{{ getNotificationEmoji(notification.type) }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ notification.title }}</p>
                  <p class="text-xs text-gray-600 mt-1 line-clamp-2">{{ notification.message }}</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <NuxtLink
            to="/notifications"
            class="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
import { ref, onMounted, computed, watch } from 'vue'
import { useNotifications } from '~/composables/useNotifications'
import { BellIcon } from '@heroicons/vue/24/solid'
import type { Notification } from '~/types/models'

const isOpen = ref(false)
const { notifications, unreadCount, markAsRead, fetchNotifications } = useNotifications()

// Close dropdown when clicking outside
const recentUnread = computed(() => {
  const unread = notifications.value.filter((n) => !n.read_at)
  return unread.slice(0, 5)
})

const getNotificationEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    follow_up_reminder: '🔔',
    deadline_alert: '⏰',
    offer: '🎉',
    event: '📅',
    daily_digest: '📊',
    inbound_interaction: '📧',
  }
  // Return empty for follow_up_reminder since it'll use BellIcon in parent
  if (type === 'follow_up_reminder') return ''
  return emojis[type] || '📬'
}

const markAllAsRead = async () => {
  const { markAllAsRead: markAll } = useNotifications()
  await markAll()
}

const handleNotificationClick = async (notification: Notification) => {
  if (!notification.read_at) {
    await markAsRead(notification.id)
  }
  isOpen.value = false

  // Navigate to related entity if available
  if (notification.action_url) {
    await navigateTo(notification.action_url)
  }
}

onMounted(async () => {
  await fetchNotifications({ limit: 10 })
})

// Refresh notifications when dropdown opens
watch(isOpen, async (newVal) => {
  if (newVal) {
    await fetchNotifications({ limit: 10 })
  }
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
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
