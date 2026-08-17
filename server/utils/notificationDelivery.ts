import { SupabaseClient } from "@supabase/supabase-js";
import { createLogger } from "~/server/utils/logger";
import {
  generateOfferNotifications,
  generateRecommendationNotifications,
  generateEventNotifications,
  generateCoachFollowupNotifications,
} from "~/server/utils/notificationGenerator";
import {
  getNotificationPrefs,
  prefFor,
  type NotificationPref,
} from "~/server/utils/notificationPreferences";
import { sendRecurringEmail } from "~/server/utils/recurringEmail";

const logger = createLogger("notifications/delivery");

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Exact days-to-deadline at which a deadline-alert email fires (≤4 per deadline lifetime). */
export const DEADLINE_EMAIL_MILESTONES = [14, 7, 3, 1] as const;

export interface DeadlineItem {
  entityId: string;
  entityType: "offer" | "recommendation";
  label: string;
  deadlineDate: string;
}

export interface DeadlineEmailItem extends DeadlineItem {
  daysUntil: number;
}

function daysUntil(deadlineDate: string, now: Date): number {
  return Math.ceil(
    (new Date(deadlineDate).getTime() - now.getTime()) / MS_PER_DAY,
  );
}

/**
 * Pure: pick deadlines sitting exactly on an email milestone. Emailing only on
 * exact boundaries (not every day within a window) caps a deadline at four
 * lifetime emails and avoids daily spam.
 */
export function selectDeadlineEmails(
  items: DeadlineItem[],
  now: Date,
): DeadlineEmailItem[] {
  const milestones = new Set<number>(DEADLINE_EMAIL_MILESTONES);
  return items.flatMap((item) => {
    const d = daysUntil(item.deadlineDate, now);
    return milestones.has(d) ? [{ ...item, daysUntil: d }] : [];
  });
}

/** Gather a user's pending offer + requested-recommendation deadlines for email. */
async function fetchDeadlineItems(
  userId: string,
  supabase: SupabaseClient,
): Promise<DeadlineItem[]> {
  const items: DeadlineItem[] = [];

  const { data: offers } = await supabase
    .from("offers")
    .select("id, school_id, deadline_date")
    .eq("user_id", userId)
    .eq("status", "pending");

  if (offers && offers.length > 0) {
    const schoolIds = [...new Set(offers.map((o) => o.school_id))];
    const { data: schools } = await supabase
      .from("schools")
      .select("id, name")
      .in("id", schoolIds);
    const schoolMap = new Map(schools?.map((s) => [s.id, s.name]) ?? []);
    for (const offer of offers) {
      if (!offer.deadline_date) continue;
      items.push({
        entityId: offer.id,
        entityType: "offer",
        label: `Offer from ${schoolMap.get(offer.school_id) ?? "a school"}`,
        deadlineDate: offer.deadline_date,
      });
    }
  }

  const { data: recs } = await supabase
    .from("recommendation_letters")
    .select("id, requested_from, deadline_date")
    .eq("user_id", userId)
    .eq("status", "requested");

  for (const rec of recs ?? []) {
    if (!rec.deadline_date) continue;
    items.push({
      entityId: rec.id,
      entityType: "recommendation",
      label: `Recommendation from ${rec.requested_from ?? "a coach"}`,
      deadlineDate: rec.deadline_date,
    });
  }

  return items;
}

/**
 * Send deadline-alert emails for the user's deadlines hitting an exact milestone.
 * Idempotency key is per (entity, milestone) so a same-day cron re-run never
 * double-sends. Gating (email_enabled) is the caller's responsibility.
 */
export async function sendDeadlineAlertEmails(
  userId: string,
  email: string,
  supabase: SupabaseClient,
  unsubscribeSecret: string,
  now: Date = new Date(),
): Promise<number> {
  const items = await fetchDeadlineItems(userId, supabase);
  const due = selectDeadlineEmails(items, now);
  let sent = 0;

  for (const item of due) {
    const urgency = item.daysUntil === 1 ? "1 day" : `${item.daysUntil} days`;
    const result = await sendRecurringEmail({
      to: email,
      subject: `Deadline in ${urgency}: ${item.label}`,
      template: "deadline-alert",
      data: {
        label: item.label,
        daysUntil: item.daysUntil,
        deadline_date: item.deadlineDate,
      },
      idempotencyKey: `deadline-${item.entityType}-${item.entityId}-${item.daysUntil}`,
      unsubscribeSecret,
    });
    if (result.success && !result.skipped) sent++;
  }

  return sent;
}

export interface DeliverResult {
  inApp: number;
  emails: number;
}

/**
 * Run all in-app notification generation and deadline emails for one user,
 * each channel gated by that user's `notification_preferences`. Fails soft per
 * source (generators swallow their own errors) so one bad user never aborts the
 * cron batch.
 */
export async function deliverNotificationsForUser(
  userId: string,
  email: string | null,
  supabase: SupabaseClient,
  unsubscribeSecret: string,
  now: Date = new Date(),
): Promise<DeliverResult> {
  const prefs = await getNotificationPrefs(userId, supabase);
  let inApp = 0;
  let emails = 0;

  if (prefFor(prefs, "follow_up_reminder").push_enabled) {
    inApp += (await generateCoachFollowupNotifications(userId, supabase)).count;
  }
  if (prefFor(prefs, "deadline_alert").push_enabled) {
    inApp += (await generateOfferNotifications(userId, supabase)).count;
    inApp += (await generateRecommendationNotifications(userId, supabase))
      .count;
  }
  if (prefFor(prefs, "event").push_enabled) {
    inApp += (await generateEventNotifications(userId, supabase)).count;
  }

  const deadlinePref: NotificationPref = prefFor(prefs, "deadline_alert");
  if (deadlinePref.email_enabled && email) {
    try {
      emails += await sendDeadlineAlertEmails(
        userId,
        email,
        supabase,
        unsubscribeSecret,
        now,
      );
    } catch (err) {
      logger.error("Failed to send deadline alert emails", { userId, err });
    }
  }

  return { inApp, emails };
}
