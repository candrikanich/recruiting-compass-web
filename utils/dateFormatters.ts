/**
 * Date Formatting Utilities with Memoization
 * Caches Intl.DateTimeFormat instances to avoid repeated object creation
 * and provides convenient formatting functions
 */

// Cache for DateTimeFormat instances (max ~20 unique locale+options combos)
const formatterCache = new Map<
  string,
  Intl.DateTimeFormat
>();

// Cache for memoized date formatting results
const formatCache = new Map<
  string,
  { timestamp: number; result: string }
>();
const FORMAT_CACHE_TTL = 60000; // 1 minute

/**
 * Get or create cached DateTimeFormatter
 * Reuses formatter instances to avoid repeated creation
 * @example
 * const formatter = getDateFormatter('en-US', { month: 'short', day: 'numeric' });
 * formatter.format(new Date()); // "Jan 27"
 */
export const getDateFormatter = (
  locale: string = "en-US",
  options: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormat => {
  // Create cache key from locale and options
  const cacheKey = `${locale}:${JSON.stringify(options)}`;

  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(cacheKey, new Intl.DateTimeFormat(locale, options));
  }

  return formatterCache.get(cacheKey)!;
};

/**
 * Format date with optional memoization
 * Caches results for the same date and options to avoid re-formatting
 * @example
 * formatDate(new Date(), { month: 'long', year: 'numeric' }); // "January 2026"
 */
export const formatDate = (
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const timestamp = dateObj.getTime();

  // Check if date is valid
  if (isNaN(timestamp)) {
    console.warn("Invalid date provided to formatDate:", date);
    return "";
  }

  // Create cache key
  const cacheKey = `${timestamp}:${JSON.stringify(options || {})}`;

  // Check cache and TTL
  const cached = formatCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FORMAT_CACHE_TTL) {
    return cached.result;
  }

  // Format and cache
  const formatter = getDateFormatter("en-US", options);
  const result = formatter.format(dateObj);

  formatCache.set(cacheKey, { timestamp: Date.now(), result });

  // Clean cache if it gets too large
  if (formatCache.size > 1000) {
    const entriesToDelete = formatCache.size - 500;
    let deleted = 0;
    for (const [key, value] of formatCache.entries()) {
      if (deleted >= entriesToDelete) break;
      // Delete old entries
      if (Date.now() - value.timestamp > FORMAT_CACHE_TTL) {
        formatCache.delete(key);
        deleted++;
      }
    }
  }

  return result;
};

/**
 * Format date as relative time (e.g., "2 days ago", "in 3 hours")
 * Uses Intl.RelativeTimeFormat for locale-aware formatting
 * @example
 * formatRelativeTime(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)); // "2 days ago"
 */
export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();

  // Determine unit and value
  let unit: Intl.RelativeTimeFormatUnit = "seconds";
  let value = Math.round(diffMs / 1000);

  if (Math.abs(value) >= 60) {
    unit = "minutes";
    value = Math.round(value / 60);
  }

  if (Math.abs(value) >= 60) {
    unit = "hours";
    value = Math.round(value / 60);
  }

  if (Math.abs(value) >= 24) {
    unit = "days";
    value = Math.round(value / 24);
  }

  if (Math.abs(value) >= 7) {
    unit = "weeks";
    value = Math.round(value / 7);
  }

  if (Math.abs(value) >= 4) {
    unit = "months";
    value = Math.round(value / 4);
  }

  if (Math.abs(value) >= 12) {
    unit = "years";
    value = Math.round(value / 12);
  }

  try {
    const formatter = new Intl.RelativeTimeFormat("en-US", {
      numeric: "auto",
    });
    return formatter.format(value, unit);
  } catch {
    // Fallback if RelativeTimeFormat is not supported
    const absValue = Math.abs(value);
    const isNegative = value < 0;
    const timeStr = `${absValue} ${unit}${absValue !== 1 ? "s" : ""}`;
    return isNegative ? `in ${timeStr}` : `${timeStr} ago`;
  }
};

/**
 * Format date as short readable string (MM/DD/YYYY)
 * @example
 * formatDateShort(new Date()); // "01/27/2026"
 */
export const formatDateShort = (date: Date | string): string => {
  return formatDate(date, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

/**
 * Format date as long readable string (January 27, 2026)
 * @example
 * formatDateLong(new Date()); // "January 27, 2026"
 */
export const formatDateLong = (date: Date | string): string => {
  return formatDate(date, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Format date with time (January 27, 2026 at 3:30 PM)
 * @example
 * formatDateTime(new Date()); // "January 27, 2026 at 3:30 PM"
 */
export const formatDateTime = (date: Date | string): string => {
  return formatDate(date, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    meridiem: "short",
  });
};

/**
 * Format time only (3:30 PM)
 * @example
 * formatTimeOnly(new Date()); // "3:30 PM"
 */
export const formatTimeOnly = (date: Date | string): string => {
  return formatDate(date, {
    hour: "numeric",
    minute: "2-digit",
    meridiem: "short",
  });
};

/**
 * Clear all formatter caches (useful for testing)
 */
export const clearDateFormatCaches = (): void => {
  formatterCache.clear();
  formatCache.clear();
};
