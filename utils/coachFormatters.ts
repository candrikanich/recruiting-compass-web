/**
 * Formatting utilities for coach data display
 */

/**
 * Format date with weekday included
 */
export const formatCoachDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Format date string to localized date with time
 */
export const formatDateWithTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
};

/**
 * Calculate how many days ago a date was
 */
export const getDaysAgoExact = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const days = Math.floor(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

/**
 * Get badge color class for coach role
 */
export const getRoleBadgeClass = (role: string): string => {
  const classes: Record<string, string> = {
    head: "bg-purple-100 text-purple-700",
    assistant: "bg-blue-100 text-blue-700",
    recruiting: "bg-emerald-100 text-emerald-700",
  };
  return classes[role] || "bg-slate-100 text-slate-700";
};
