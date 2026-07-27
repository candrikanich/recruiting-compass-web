/**
 * Date formatting utilities for consistent date display across the application
 */
import { parseLocalDateOnly } from "./localDate";

// Date-only values (e.g. `date` DB columns like `last_contact_date`) have no
// time component and must be parsed as LOCAL midnight — `new Date("YYYY-MM-DD")`
// parses as UTC midnight, which renders/compares a day early in US timezones.
// Full timestamps (with a time component) are safe to parse directly.
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseFlexible = (dateString: string): Date =>
  DATE_ONLY_PATTERN.test(dateString)
    ? parseLocalDateOnly(dateString)
    : new Date(dateString);

/**
 * Format a date string into a human-readable format
 * @param dateString - ISO date string (date-only or full timestamp)
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  const date = parseFlexible(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Calculate the number of days between a date and today
 * @param dateString - ISO date string (date-only or full timestamp)
 * @returns Number of days ago (always positive)
 */
export const daysAgo = (dateString: string): number => {
  const date = parseFlexible(dateString);
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

/**
 * Format a date string to a localized date-time string
 * @param dateString - ISO date string
 * @returns Formatted date-time string (e.g., "Jan 15, 2024, 3:45 PM")
 */
export const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return "Unknown";

  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
