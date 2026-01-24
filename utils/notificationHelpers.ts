import type { Notification } from "~/types/models";

/**
 * Get the route to navigate to based on notification's related entity
 */
export function getNotificationRoute(notification: Notification): string {
  switch (notification.related_entity_type) {
    case "offer":
      return `/offers?highlight=${notification.related_entity_id}`;
    case "event":
      return `/events/${notification.related_entity_id}`;
    case "recommendation":
      return `/documents?type=recommendation`;
    case "coach":
      return `/coaches?highlight=${notification.related_entity_id}`;
    case "school":
      return `/schools/${notification.related_entity_id}`;
    default:
      return "/notifications";
  }
}

/**
 * Format notification message for display
 */
export function formatNotificationMessage(notification: Notification): string {
  return notification.message;
}

/**
 * Get priority color for styling
 */
export function getPriorityColor(priority?: string): string {
  switch (priority) {
    case "high":
      return "text-red-600";
    case "normal":
      return "text-blue-600";
    case "low":
      return "text-gray-600";
    default:
      return "text-gray-600";
  }
}

/**
 * Get type emoji for notification
 */
export function getNotificationEmoji(type: string): string {
  const emojis: Record<string, string> = {
    follow_up: "🔔",
    deadline: "⏰",
    offer: "🎉",
    event: "📅",
    general: "📬",
  };
  return emojis[type] || "📬";
}
