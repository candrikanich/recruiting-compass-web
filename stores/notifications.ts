import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Notification } from "~/types/models";

export const useNotificationStore = defineStore("notifications", () => {
  const unreadNotifications = ref<Notification[]>([]);

  const unreadCount = computed(() => unreadNotifications.value.length);

  const addUnreadNotification = (notification: Notification) => {
    if (!notification.read_at) {
      unreadNotifications.value.unshift(notification);
    }
  };

  const removeUnreadNotification = (id: string) => {
    unreadNotifications.value = unreadNotifications.value.filter(
      (n) => n.id !== id,
    );
  };

  const markAsRead = (id: string) => {
    removeUnreadNotification(id);
  };

  const clearAll = () => {
    unreadNotifications.value = [];
  };

  return {
    unreadNotifications,
    unreadCount,
    addUnreadNotification,
    removeUnreadNotification,
    markAsRead,
    clearAll,
  };
});
