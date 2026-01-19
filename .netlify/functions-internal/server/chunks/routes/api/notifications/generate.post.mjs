import { d as defineEventHandler, a as createError } from '../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../_/supabase.mjs';
import { r as requireAuth, a as assertNotParent } from '../../../_/auth.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const TEMPLATES = {
  offer_deadline_14: {
    title: (schoolName) => `Offer deadline approaching: ${schoolName}`,
    message: (schoolName, daysLeft) => `Your offer from ${schoolName} is due in ${daysLeft != null ? daysLeft : 14} days. Review the terms and prepare your decision.`
  },
  offer_deadline_7: {
    title: (schoolName) => `Offer deadline in 7 days: ${schoolName}`,
    message: (schoolName) => `Deadline for your ${schoolName} offer is in one week.`
  },
  offer_deadline_3: {
    title: (schoolName) => `Urgent: Offer deadline in 3 days - ${schoolName}`,
    message: (schoolName) => `Your offer from ${schoolName} expires in 3 days!`
  },
  offer_deadline_1: {
    title: (schoolName) => `FINAL: Offer expires tomorrow - ${schoolName}`,
    message: (schoolName) => `Last day to respond to ${schoolName} offer!`
  },
  rec_deadline_14: {
    title: (name) => `Recommendation due in 14 days from ${name}`,
    message: (name) => `Rec letter from ${name} is due in 2 weeks. Follow up if needed.`
  },
  rec_deadline_7: {
    title: (name) => `Recommendation due in 7 days from ${name}`,
    message: (name) => `Rec letter deadline from ${name} is one week away.`
  },
  event_upcoming_7: {
    title: (eventName) => `Event in 7 days: ${eventName}`,
    message: (eventName) => `Don't forget: ${eventName} is coming up in one week. Prepare accordingly.`
  },
  event_upcoming_1: {
    title: (eventName) => `Event tomorrow: ${eventName}`,
    message: (eventName) => `${eventName} is tomorrow. Final preparations today!`
  },
  coach_followup: {
    title: (coachName) => `Follow up with ${coachName}`,
    message: (coachName, daysSince) => `It's been ${daysSince != null ? daysSince : 0} days since last contact with ${coachName}. Reach out to maintain the relationship.`
  }
};
async function generateOfferNotifications(userId, supabase) {
  try {
    const { data: offers, error: offersError } = await supabase.from("offers").select("id, school_id, deadline_date, status").eq("user_id", userId).eq("status", "pending");
    if (offersError) throw offersError;
    if (!offers || offers.length === 0) return { count: 0, type: "offers" };
    const schoolIds = [...new Set(offers.map((o) => o.school_id))];
    const { data: schools, error: schoolsError } = await supabase.from("schools").select("id, name").in("id", schoolIds);
    if (schoolsError) throw schoolsError;
    const schoolMap = new Map((schools == null ? void 0 : schools.map((s) => [s.id, s.name])) || []);
    let createdCount = 0;
    const now = /* @__PURE__ */ new Date();
    for (const offer of offers) {
      if (!offer.deadline_date) continue;
      const deadline = new Date(offer.deadline_date);
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      const schoolName = schoolMap.get(offer.school_id) || "Unknown School";
      const leadTimes = [14, 7, 3, 1];
      for (const days of leadTimes) {
        if (daysUntil === days) {
          const { data: existing, error: checkError } = await supabase.from("notifications").select("id").eq("user_id", userId).eq("related_entity_id", offer.id).eq("related_entity_type", "offer").eq("type", "deadline").eq("scheduled_for", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]).single();
          if (checkError && checkError.code !== "PGRST116") throw checkError;
          if (!existing) {
            const template = TEMPLATES[`offer_deadline_${days}`];
            await supabase.from("notifications").insert([
              {
                user_id: userId,
                type: "deadline",
                title: template.title(schoolName),
                message: template.message(schoolName, days),
                related_entity_type: "offer",
                related_entity_id: offer.id,
                related_offer_id: offer.id,
                scheduled_for: (/* @__PURE__ */ new Date()).toISOString(),
                priority: days <= 3 ? "high" : "normal"
              }
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
async function generateRecommendationNotifications(userId, supabase) {
  try {
    const { data: recommendations, error: recsError } = await supabase.from("recommendation_letters").select("id, requested_from, deadline_date, status").eq("user_id", userId).eq("status", "requested");
    if (recsError) throw recsError;
    if (!recommendations || recommendations.length === 0) return { count: 0, type: "recommendations" };
    let createdCount = 0;
    const now = /* @__PURE__ */ new Date();
    for (const rec of recommendations) {
      if (!rec.deadline_date) continue;
      const deadline = new Date(rec.deadline_date);
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      const personName = rec.requested_from || "Coach";
      const leadTimes = [14, 7];
      for (const days of leadTimes) {
        if (daysUntil === days) {
          const { data: existing, error: checkError } = await supabase.from("notifications").select("id").eq("user_id", userId).eq("related_entity_id", rec.id).eq("related_entity_type", "recommendation").eq("type", "deadline").eq("scheduled_for", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]).single();
          if (checkError && checkError.code !== "PGRST116") throw checkError;
          if (!existing) {
            const templateKey = `rec_deadline_${days}`;
            const template = TEMPLATES[templateKey];
            await supabase.from("notifications").insert([
              {
                user_id: userId,
                type: "deadline",
                title: template.title(personName),
                message: template.message(personName),
                related_entity_type: "recommendation",
                related_entity_id: rec.id,
                scheduled_for: (/* @__PURE__ */ new Date()).toISOString(),
                priority: "normal"
              }
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
async function generateEventNotifications(userId, supabase) {
  try {
    const { data: events, error: eventsError } = await supabase.from("events").select("id, name, start_date").eq("user_id", userId).eq("attended", false);
    if (eventsError) throw eventsError;
    if (!events || events.length === 0) return { count: 0, type: "events" };
    let createdCount = 0;
    const now = /* @__PURE__ */ new Date();
    for (const event of events) {
      const startDate = new Date(event.start_date);
      const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      const leadTimes = [7, 1];
      for (const days of leadTimes) {
        if (daysUntil === days) {
          const { data: existing, error: checkError } = await supabase.from("notifications").select("id").eq("user_id", userId).eq("related_entity_id", event.id).eq("related_entity_type", "event").eq("type", "deadline").eq("scheduled_for", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]).single();
          if (checkError && checkError.code !== "PGRST116") throw checkError;
          if (!existing) {
            const templateKey = `event_upcoming_${days}`;
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
                scheduled_for: (/* @__PURE__ */ new Date()).toISOString(),
                priority: days === 1 ? "high" : "normal"
              }
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
async function generateCoachFollowupNotifications(userId, supabase) {
  try {
    const { data: coaches, error: coachesError } = await supabase.from("coaches").select("id, first_name, last_name, last_contact_date").eq("user_id", userId);
    if (coachesError) throw coachesError;
    if (!coaches || coaches.length === 0) return { count: 0, type: "coaches" };
    let createdCount = 0;
    const now = /* @__PURE__ */ new Date();
    const FOLLOWUP_THRESHOLD = 7;
    for (const coach of coaches) {
      if (!coach.last_contact_date) continue;
      const lastContact = new Date(coach.last_contact_date);
      const daysSince = Math.ceil((now.getTime() - lastContact.getTime()) / (1e3 * 60 * 60 * 24));
      if (daysSince === FOLLOWUP_THRESHOLD) {
        const { data: existing, error: checkError } = await supabase.from("notifications").select("id").eq("user_id", userId).eq("related_entity_id", coach.id).eq("related_entity_type", "coach").eq("type", "follow_up").eq("scheduled_for", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]).single();
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
              scheduled_for: (/* @__PURE__ */ new Date()).toISOString(),
              priority: "normal"
            }
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

const generate_post = defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const supabase = createServerSupabaseClient();
    await assertNotParent(user.id, supabase);
    const results = await Promise.all([
      generateOfferNotifications(user.id, supabase),
      generateRecommendationNotifications(user.id, supabase),
      generateEventNotifications(user.id, supabase),
      generateCoachFollowupNotifications(user.id, supabase)
    ]);
    const totalCreated = results.reduce((sum, r) => sum + r.count, 0);
    return {
      success: true,
      created: totalCreated,
      breakdown: {
        offers: results[0].count,
        recommendations: results[1].count,
        events: results[2].count,
        coaches: results[3].count
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (err) {
    console.error("Error generating notifications:", err);
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || "Failed to generate notifications"
    });
  }
});

export { generate_post as default };
//# sourceMappingURL=generate.post.mjs.map
