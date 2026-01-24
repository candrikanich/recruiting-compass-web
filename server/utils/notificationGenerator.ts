import { SupabaseClient } from "@supabase/supabase-js";

export interface NotificationGenerationResult {
  count: number;
  type: string;
}

// Helper function to check if email should be sent based on user preferences
async function _shouldSendEmail(
  supabase: SupabaseClient,
  userId: string,
  priority: string,
): Promise<boolean> {
  try {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("notification_settings")
      .eq("user_id", userId)
      .single();

    if (!prefs?.notification_settings?.enableEmailNotifications) return false;
    if (
      prefs.notification_settings.emailOnlyHighPriority &&
      priority !== "high"
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

// Template type definitions
interface NotificationTemplate {
  title: (arg: string, arg2?: number) => string;
  message: (arg: string, arg2?: number) => string;
}

// Message templates for different notification types
const TEMPLATES: Record<string, NotificationTemplate> = {
  offer_deadline_14: {
    title: (schoolName: string) => `Offer deadline approaching: ${schoolName}`,
    message: (schoolName: string, daysLeft?: number) =>
      `Your offer from ${schoolName} is due in ${daysLeft ?? 14} days. Review the terms and prepare your decision.`,
  },
  offer_deadline_7: {
    title: (schoolName: string) => `Offer deadline in 7 days: ${schoolName}`,
    message: (schoolName: string) =>
      `Deadline for your ${schoolName} offer is in one week.`,
  },
  offer_deadline_3: {
    title: (schoolName: string) =>
      `Urgent: Offer deadline in 3 days - ${schoolName}`,
    message: (schoolName: string) =>
      `Your offer from ${schoolName} expires in 3 days!`,
  },
  offer_deadline_1: {
    title: (schoolName: string) =>
      `FINAL: Offer expires tomorrow - ${schoolName}`,
    message: (schoolName: string) =>
      `Last day to respond to ${schoolName} offer!`,
  },
  rec_deadline_14: {
    title: (name: string) => `Recommendation due in 14 days from ${name}`,
    message: (name: string) =>
      `Rec letter from ${name} is due in 2 weeks. Follow up if needed.`,
  },
  rec_deadline_7: {
    title: (name: string) => `Recommendation due in 7 days from ${name}`,
    message: (name: string) =>
      `Rec letter deadline from ${name} is one week away.`,
  },
  event_upcoming_7: {
    title: (eventName: string) => `Event in 7 days: ${eventName}`,
    message: (eventName: string) =>
      `Don't forget: ${eventName} is coming up in one week. Prepare accordingly.`,
  },
  event_upcoming_1: {
    title: (eventName: string) => `Event tomorrow: ${eventName}`,
    message: (eventName: string) =>
      `${eventName} is tomorrow. Final preparations today!`,
  },
  coach_followup: {
    title: (coachName: string) => `Follow up with ${coachName}`,
    message: (coachName: string, daysSince?: number) =>
      `It's been ${daysSince ?? 0} days since last contact with ${coachName}. Reach out to maintain the relationship.`,
  },
};

/**
 * Generate notifications for upcoming offer deadlines
 */
export async function generateOfferNotifications(
  userId: string,
  supabase: SupabaseClient,
): Promise<NotificationGenerationResult> {
  try {
    const { data: offers, error: offersError } = await supabase
      .from("offers")
      .select("id, school_id, deadline_date, status")
      .eq("user_id", userId)
      .eq("status", "pending");

    if (offersError) throw offersError;
    if (!offers || offers.length === 0) return { count: 0, type: "offers" };

    // Get schools for names
    const schoolIds = [...new Set(offers.map((o) => o.school_id))];
    const { data: schools, error: schoolsError } = await supabase
      .from("schools")
      .select("id, name")
      .in("id", schoolIds);

    if (schoolsError) throw schoolsError;
    const schoolMap = new Map(schools?.map((s) => [s.id, s.name]) || []);

    let createdCount = 0;
    const now = new Date();

    for (const offer of offers) {
      if (!offer.deadline_date) continue;

      const deadline = new Date(offer.deadline_date);
      const daysUntil = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const schoolName = schoolMap.get(offer.school_id) || "Unknown School";

      // Check for 14, 7, 3, 1 day reminders
      const leadTimes = [14, 7, 3, 1];

      for (const days of leadTimes) {
        if (daysUntil === days) {
          // Check if notification already exists
          const { data: existing, error: checkError } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("related_entity_id", offer.id)
            .eq("related_entity_type", "offer")
            .eq("type", "deadline")
            .eq("scheduled_for", new Date().toISOString().split("T")[0])
            .single();

          if (checkError && checkError.code !== "PGRST116") throw checkError; // PGRST116 = no rows returned

          // Only create if doesn't exist
          if (!existing) {
            const template =
              TEMPLATES[`offer_deadline_${days}` as keyof typeof TEMPLATES];
            await supabase.from("notifications").insert([
              {
                user_id: userId,
                type: "deadline",
                title: template.title(schoolName),
                message: template.message(schoolName, days),
                related_entity_type: "offer",
                related_entity_id: offer.id,
                related_offer_id: offer.id,
                scheduled_for: new Date().toISOString(),
                priority: days <= 3 ? "high" : "normal",
              },
            ]);

            createdCount++;
          }
        }
      }
    }

    return { count: createdCount, type: "offers" };
  } catch (err) {
    console.error("Error generating offer notifications:", err);
    return { count: 0, type: "offers" };
  }
}

/**
 * Generate notifications for recommendation letter deadlines
 */
export async function generateRecommendationNotifications(
  userId: string,
  supabase: SupabaseClient,
): Promise<NotificationGenerationResult> {
  try {
    const { data: recommendations, error: recsError } = await supabase
      .from("recommendation_letters")
      .select("id, requested_from, deadline_date, status")
      .eq("user_id", userId)
      .eq("status", "requested");

    if (recsError) throw recsError;
    if (!recommendations || recommendations.length === 0)
      return { count: 0, type: "recommendations" };

    let createdCount = 0;
    const now = new Date();

    for (const rec of recommendations) {
      if (!rec.deadline_date) continue;

      const deadline = new Date(rec.deadline_date);
      const daysUntil = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const personName = rec.requested_from || "Coach";

      // Check for 14 and 7 day reminders
      const leadTimes = [14, 7];

      for (const days of leadTimes) {
        if (daysUntil === days) {
          // Check if notification already exists
          const { data: existing, error: checkError } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("related_entity_id", rec.id)
            .eq("related_entity_type", "recommendation")
            .eq("type", "deadline")
            .eq("scheduled_for", new Date().toISOString().split("T")[0])
            .single();

          if (checkError && checkError.code !== "PGRST116") throw checkError;

          if (!existing) {
            const templateKey =
              `rec_deadline_${days}` as keyof typeof TEMPLATES;
            const template = TEMPLATES[templateKey];
            await supabase.from("notifications").insert([
              {
                user_id: userId,
                type: "deadline",
                title: template.title(personName),
                message: template.message(personName),
                related_entity_type: "recommendation",
                related_entity_id: rec.id,
                scheduled_for: new Date().toISOString(),
                priority: "normal",
              },
            ]);

            createdCount++;
          }
        }
      }
    }

    return { count: createdCount, type: "recommendations" };
  } catch (err) {
    console.error("Error generating recommendation notifications:", err);
    return { count: 0, type: "recommendations" };
  }
}

/**
 * Generate notifications for upcoming events
 */
export async function generateEventNotifications(
  userId: string,
  supabase: SupabaseClient,
): Promise<NotificationGenerationResult> {
  try {
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, name, start_date")
      .eq("user_id", userId)
      .eq("attended", false);

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) return { count: 0, type: "events" };

    let createdCount = 0;
    const now = new Date();

    for (const event of events) {
      const startDate = new Date(event.start_date);
      const daysUntil = Math.ceil(
        (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Check for 7 and 1 day reminders
      const leadTimes = [7, 1];

      for (const days of leadTimes) {
        if (daysUntil === days) {
          // Check if notification already exists
          const { data: existing, error: checkError } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("related_entity_id", event.id)
            .eq("related_entity_type", "event")
            .eq("type", "deadline")
            .eq("scheduled_for", new Date().toISOString().split("T")[0])
            .single();

          if (checkError && checkError.code !== "PGRST116") throw checkError;

          if (!existing) {
            const templateKey =
              `event_upcoming_${days}` as keyof typeof TEMPLATES;
            const template = TEMPLATES[templateKey];
            await supabase.from("notifications").insert([
              {
                user_id: userId,
                type: "deadline",
                title: template.title(event.name),
                message: template.message(event.name),
                related_entity_type: "event",
                related_entity_id: event.id,
                related_event_id: event.id,
                scheduled_for: new Date().toISOString(),
                priority: days === 1 ? "high" : "normal",
              },
            ]);

            createdCount++;
          }
        }
      }
    }

    return { count: createdCount, type: "events" };
  } catch (err) {
    console.error("Error generating event notifications:", err);
    return { count: 0, type: "events" };
  }
}

/**
 * Generate notifications for coach follow-ups (7 days since last contact)
 */
export async function generateCoachFollowupNotifications(
  userId: string,
  supabase: SupabaseClient,
): Promise<NotificationGenerationResult> {
  try {
    const { data: coaches, error: coachesError } = await supabase
      .from("coaches")
      .select("id, first_name, last_name, last_contact_date")
      .eq("user_id", userId);

    if (coachesError) throw coachesError;
    if (!coaches || coaches.length === 0) return { count: 0, type: "coaches" };

    let createdCount = 0;
    const now = new Date();
    const FOLLOWUP_THRESHOLD = 7; // days

    for (const coach of coaches) {
      if (!coach.last_contact_date) continue;

      const lastContact = new Date(coach.last_contact_date);
      const daysSince = Math.ceil(
        (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSince === FOLLOWUP_THRESHOLD) {
        // Check if notification already exists for this coach
        const { data: existing, error: checkError } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("related_entity_id", coach.id)
          .eq("related_entity_type", "coach")
          .eq("type", "follow_up")
          .eq("scheduled_for", new Date().toISOString().split("T")[0])
          .single();

        if (checkError && checkError.code !== "PGRST116") throw checkError;

        if (!existing) {
          const coachName = `${coach.first_name} ${coach.last_name}`.trim();
          const template = TEMPLATES.coach_followup;
          await supabase.from("notifications").insert([
            {
              user_id: userId,
              type: "follow_up",
              title: template.title(coachName),
              message: template.message(coachName, FOLLOWUP_THRESHOLD),
              related_entity_type: "coach",
              related_entity_id: coach.id,
              related_coach_id: coach.id,
              scheduled_for: new Date().toISOString(),
              priority: "normal",
            },
          ]);

          createdCount++;
        }
      }
    }

    return { count: createdCount, type: "coaches" };
  } catch (err) {
    console.error("Error generating coach follow-up notifications:", err);
    return { count: 0, type: "coaches" };
  }
}

/**
 * Generate daily digest notifications summarizing activity
 */
export async function generateDailyDigest(
  userId: string,
  supabase: SupabaseClient,
): Promise<NotificationGenerationResult> {
  try {
    // Check if daily digest is enabled
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("notification_settings")
      .eq("user_id", userId)
      .single();

    if (!prefs?.notification_settings?.enableDailyDigest) {
      return { count: 0, type: "daily_digest" };
    }

    // Calculate yesterday's date range
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    // Query yesterday's activity
    const { data: interactions } = await supabase
      .from("interactions")
      .select("id")
      .eq("user_id", userId)
      .gte("occurred_at", yesterday.toISOString())
      .lt("occurred_at", today.toISOString());

    const { data: events } = await supabase
      .from("events")
      .select("id")
      .eq("user_id", userId)
      .gte("start_date", yesterdayStr)
      .lte("start_date", yesterdayStr);

    const { data: metrics } = await supabase
      .from("performance_metrics")
      .select("id")
      .eq("user_id", userId)
      .gte("recorded_date", yesterdayStr)
      .lt("recorded_date", todayStr);

    // If no activity, skip digest
    const interactionCount = interactions?.length || 0;
    const eventCount = events?.length || 0;
    const metricCount = metrics?.length || 0;

    if (interactionCount === 0 && eventCount === 0 && metricCount === 0) {
      return { count: 0, type: "daily_digest" };
    }

    // Check if digest already created for today
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "daily_digest")
      .eq("scheduled_for", today.toISOString().split("T")[0])
      .single();

    if (existing) {
      return { count: 0, type: "daily_digest" };
    }

    // Create digest summary
    const summaryLines = [
      `Yesterday's Activity Summary:`,
      `• ${interactionCount} interaction${interactionCount !== 1 ? "s" : ""} logged`,
      `• ${eventCount} event${eventCount !== 1 ? "s" : ""} attended`,
      `• ${metricCount} performance metric${metricCount !== 1 ? "s" : ""} recorded`,
    ];

    const message = summaryLines.join("\n");

    // Create notification
    const { error: insertError } = await supabase.from("notifications").insert([
      {
        user_id: userId,
        type: "daily_digest",
        title: "Daily Activity Summary",
        message,
        scheduled_for: today.toISOString(),
        priority: "low",
      },
    ]);

    if (insertError) throw insertError;

    return { count: 1, type: "daily_digest" };
  } catch (err) {
    console.error("Error generating daily digest:", err);
    return { count: 0, type: "daily_digest" };
  }
}
