import { SupabaseClient } from "@supabase/supabase-js";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("notifications/preferences");

/**
 * Notification types surfaced by the Notification Preferences settings page
 * (`pages/settings/notifications.vue`) and stored in the `notification_preferences`
 * table. The table's CHECK constraint also permits `inbound_interaction` and
 * `offer`, but those have no UI toggle and are out of scope for delivery here.
 */
export type NotificationType =
  "follow_up_reminder" | "deadline_alert" | "weekly_digest" | "event";

export interface NotificationPref {
  push_enabled: boolean;
  email_enabled: boolean;
}

/**
 * Default when a user has never toggled a type: both channels ON. Mirrors the
 * DB column defaults (`push_enabled`/`email_enabled` default true) and the
 * settings page's initial rendered state, so an untouched account still
 * receives notifications.
 */
export const DEFAULT_PREF: NotificationPref = {
  push_enabled: true,
  email_enabled: true,
};

interface PrefRow {
  notification_type: string;
  push_enabled: boolean | null;
  email_enabled: boolean | null;
}

/** Fold raw preference rows into a type→pref map, tolerating null columns. */
export function normalizePrefs(rows: PrefRow[]): Map<string, NotificationPref> {
  const map = new Map<string, NotificationPref>();
  for (const row of rows) {
    map.set(row.notification_type, {
      push_enabled: row.push_enabled ?? DEFAULT_PREF.push_enabled,
      email_enabled: row.email_enabled ?? DEFAULT_PREF.email_enabled,
    });
  }
  return map;
}

/** Look up a type's pref, falling back to the enabled-by-default value. */
export function prefFor(
  prefs: Map<string, NotificationPref>,
  type: NotificationType,
): NotificationPref {
  return prefs.get(type) ?? DEFAULT_PREF;
}

/**
 * Load a user's notification preferences. Fails open — on any query error the
 * caller gets an empty map, so `prefFor` returns enabled-by-default rather than
 * silently suppressing notifications.
 */
export async function getNotificationPrefs(
  userId: string,
  supabase: SupabaseClient,
): Promise<Map<string, NotificationPref>> {
  try {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("notification_type, push_enabled, email_enabled")
      .eq("user_id", userId);

    if (error) throw error;
    return normalizePrefs((data as PrefRow[] | null) ?? []);
  } catch (err) {
    logger.error("Failed to load notification preferences", err);
    return new Map();
  }
}
