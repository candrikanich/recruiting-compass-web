/**
 * User Preference Validation Utilities
 *
 * Type-safe conversion from V2's generic Record<string, unknown>
 * to strongly-typed preference objects
 */

import type {
  NotificationSettings,
  HomeLocation,
  PlayerDetails,
  SchoolPreferences,
  DashboardWidgetVisibility,
} from "~/types/models";

/**
 * Validates and extracts notification settings
 * Provides sensible defaults for missing fields
 */
export function validateNotificationSettings(
  data: unknown
): NotificationSettings | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  return {
    followUpReminderDays: toNumber(obj.followUpReminderDays, 7),
    enableFollowUpReminders: toBoolean(obj.enableFollowUpReminders, true),
    enableDeadlineAlerts: toBoolean(obj.enableDeadlineAlerts, true),
    enableDailyDigest: toBoolean(obj.enableDailyDigest, true),
    enableInboundInteractionAlerts: toBoolean(
      obj.enableInboundInteractionAlerts,
      true
    ),
    enableEmailNotifications: toBoolean(obj.enableEmailNotifications, true),
    emailOnlyHighPriority: toBoolean(obj.emailOnlyHighPriority, false),
    quietHoursStart: toString(obj.quietHoursStart),
    quietHoursEnd: toString(obj.quietHoursEnd),
  };
}

/**
 * Validates and extracts home location
 * Returns null if empty/missing
 */
export function validateHomeLocation(data: unknown): HomeLocation | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Check if location has any meaningful data
  if (!obj.address && !obj.city && !obj.state && !obj.latitude) {
    return null;
  }

  return {
    address: toString(obj.address),
    city: toString(obj.city),
    state: toString(obj.state),
    zip: toString(obj.zip),
    latitude: toNumber(obj.latitude),
    longitude: toNumber(obj.longitude),
  };
}

/**
 * Validates and extracts player details
 * Returns null if empty/missing
 */
export function validatePlayerDetails(data: unknown): PlayerDetails | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Check if player has any meaningful data
  if (Object.keys(obj).length === 0) return null;

  return {
    graduation_year: toNumber(obj.graduation_year),
    high_school: toString(obj.high_school),
    club_team: toString(obj.club_team),
    positions: toStringArray(obj.positions),
    bats: toOption<"L" | "R" | "S">(obj.bats, ["L", "R", "S"]),
    throws: toOption<"L" | "R">(obj.throws, ["L", "R"]),
    height_inches: toNumber(obj.height_inches),
    weight_lbs: toNumber(obj.weight_lbs),
    gpa: toNumber(obj.gpa),
    sat_score: toNumber(obj.sat_score),
    act_score: toNumber(obj.act_score),
    ncaa_id: toString(obj.ncaa_id),
    perfect_game_id: toString(obj.perfect_game_id),
    prep_baseball_id: toString(obj.prep_baseball_id),
    twitter_handle: toString(obj.twitter_handle),
    instagram_handle: toString(obj.instagram_handle),
    tiktok_handle: toString(obj.tiktok_handle),
    facebook_url: toString(obj.facebook_url),
    phone: toString(obj.phone),
    email: toString(obj.email),
    allow_share_phone: toBoolean(obj.allow_share_phone),
    allow_share_email: toBoolean(obj.allow_share_email),
    school_name: toString(obj.school_name),
    school_address: toString(obj.school_address),
    school_city: toString(obj.school_city),
    school_state: toString(obj.school_state),
    ninth_grade_team: toString(obj.ninth_grade_team),
    ninth_grade_coach: toString(obj.ninth_grade_coach),
    tenth_grade_team: toString(obj.tenth_grade_team),
    tenth_grade_coach: toString(obj.tenth_grade_coach),
    eleventh_grade_team: toString(obj.eleventh_grade_team),
    eleventh_grade_coach: toString(obj.eleventh_grade_coach),
    twelfth_grade_team: toString(obj.twelfth_grade_team),
    twelfth_grade_coach: toString(obj.twelfth_grade_coach),
    travel_team_year: toNumber(obj.travel_team_year),
    travel_team_name: toString(obj.travel_team_name),
    travel_team_coach: toString(obj.travel_team_coach),
  };
}

/**
 * Validates and extracts school preferences
 * Returns null if empty/missing
 */
export function validateSchoolPreferences(
  data: unknown
): SchoolPreferences | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  const preferences = toArray(obj.preferences);

  if (preferences.length === 0) return null;

  return {
    preferences: preferences.map((pref) => {
      const p = pref as Record<string, unknown>;
      return {
        id: toString(p.id) || "",
        category: toOption(p.category, [
          "location",
          "academic",
          "program",
          "custom",
        ]) || ("custom" as const),
        type: toString(p.type) || "",
        value: p.value,
        priority: toNumber(p.priority, 0),
        is_dealbreaker: toBoolean(p.is_dealbreaker, false),
      };
    }),
    template_used: toString(obj.template_used),
    last_updated: toString(obj.last_updated) || new Date().toISOString(),
  };
}

/**
 * Validates and extracts dashboard layout
 * Returns null if empty/missing
 */
export function validateDashboardLayout(
  data: unknown
): DashboardWidgetVisibility | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Return default if layout is empty
  if (Object.keys(obj).length === 0) return null;

  const statsCards = (obj.statsCards || {}) as Record<string, unknown>;
  const widgets = (obj.widgets || {}) as Record<string, unknown>;

  return {
    statsCards: {
      coaches: toBoolean(statsCards.coaches, true),
      schools: toBoolean(statsCards.schools, true),
      interactions: toBoolean(statsCards.interactions, true),
      offers: toBoolean(statsCards.offers, true),
      events: toBoolean(statsCards.events, true),
      performance: toBoolean(statsCards.performance, true),
      notifications: toBoolean(statsCards.notifications, true),
      socialMedia: toBoolean(statsCards.socialMedia, true),
    },
    widgets: {
      recentNotifications: toBoolean(widgets.recentNotifications, true),
      linkedAccounts: toBoolean(widgets.linkedAccounts, true),
      recruitingCalendar: toBoolean(widgets.recruitingCalendar, true),
      quickTasks: toBoolean(widgets.quickTasks, true),
      atAGlanceSummary: toBoolean(widgets.atAGlanceSummary, true),
      offerStatusOverview: toBoolean(widgets.offerStatusOverview, true),
      interactionTrendChart: toBoolean(widgets.interactionTrendChart, true),
      schoolInterestChart: toBoolean(widgets.schoolInterestChart, true),
      schoolMapWidget: toBoolean(widgets.schoolMapWidget, true),
      coachFollowupWidget: toBoolean(widgets.coachFollowupWidget, true),
      eventsSummary: toBoolean(widgets.eventsSummary, true),
      performanceSummary: toBoolean(widgets.performanceSummary, true),
      recentDocuments: toBoolean(widgets.recentDocuments, true),
      interactionStats: toBoolean(widgets.interactionStats, true),
      schoolStatusOverview: toBoolean(widgets.schoolStatusOverview, true),
      coachResponsiveness: toBoolean(widgets.coachResponsiveness, true),
      upcomingDeadlines: toBoolean(widgets.upcomingDeadlines, true),
    },
  };
}

/**
 * Type conversion helpers
 */

function toBoolean(value: unknown, defaultValue = false): boolean {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function toNumber(value: unknown, defaultValue?: number): number | undefined {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
}

function toString(value: unknown, defaultValue?: string): string | undefined {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((v) => String(v));
}

function toArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value;
}

function toOption<T extends string>(
  value: unknown,
  validOptions: T[]
): T | undefined {
  const str = String(value).trim();
  if (!str) return undefined;
  const found = validOptions.find((opt) => opt === str);
  return found as T | undefined;
}

/**
 * Default preference factories
 */

export function getDefaultNotificationSettings(): NotificationSettings {
  return {
    followUpReminderDays: 7,
    enableFollowUpReminders: true,
    enableDeadlineAlerts: true,
    enableDailyDigest: true,
    enableInboundInteractionAlerts: true,
    enableEmailNotifications: true,
    emailOnlyHighPriority: false,
  };
}

export function getDefaultHomeLocation(): HomeLocation {
  return {
    address: undefined,
    city: undefined,
    state: undefined,
    zip: undefined,
    latitude: undefined,
    longitude: undefined,
  };
}

export function getDefaultPlayerDetails(): PlayerDetails {
  return {
    graduation_year: undefined,
    high_school: undefined,
    club_team: undefined,
    positions: undefined,
  };
}

export function getDefaultSchoolPreferences(): SchoolPreferences {
  return {
    preferences: [],
    last_updated: new Date().toISOString(),
  };
}

export function getDefaultDashboardLayout(): DashboardWidgetVisibility {
  const defaultVisibility = true;

  return {
    statsCards: {
      coaches: defaultVisibility,
      schools: defaultVisibility,
      interactions: defaultVisibility,
      offers: defaultVisibility,
      events: defaultVisibility,
      performance: defaultVisibility,
      notifications: defaultVisibility,
      socialMedia: defaultVisibility,
    },
    widgets: {
      recentNotifications: defaultVisibility,
      linkedAccounts: defaultVisibility,
      recruitingCalendar: defaultVisibility,
      quickTasks: defaultVisibility,
      atAGlanceSummary: defaultVisibility,
      offerStatusOverview: defaultVisibility,
      interactionTrendChart: defaultVisibility,
      schoolInterestChart: defaultVisibility,
      schoolMapWidget: defaultVisibility,
      coachFollowupWidget: defaultVisibility,
      eventsSummary: defaultVisibility,
      performanceSummary: defaultVisibility,
      recentDocuments: defaultVisibility,
      interactionStats: defaultVisibility,
      schoolStatusOverview: defaultVisibility,
      coachResponsiveness: defaultVisibility,
      upcomingDeadlines: defaultVisibility,
    },
  };
}
