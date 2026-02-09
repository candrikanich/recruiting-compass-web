/**
 * Date formatting utilities for consistent date display across the application
 */

/**
 * Format a date string into a human-readable format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Calculate the number of days between a date and today
 * @param dateString - ISO date string
 * @returns Number of days ago (always positive)
 */
export const daysAgo = (dateString: string): number => {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Format a date with relative time information
 * @param dateString - ISO date string
 * @returns Formatted string with both date and relative time (e.g., "Jan 15, 2024 (5 days ago)")
 */
export const formatDateWithRelative = (dateString: string): string => {
  const formatted = formatDate(dateString);
  const days = daysAgo(dateString);
  return `${formatted} (${days} ${days === 1 ? "day" : "days"} ago)`;
};
