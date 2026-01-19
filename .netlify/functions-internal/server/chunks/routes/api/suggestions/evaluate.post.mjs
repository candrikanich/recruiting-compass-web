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

async function isDuplicateSuggestion(supabase, athleteId, suggestion, daysWindow = 7) {
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysWindow);
  const { data, error } = await supabase.from("suggestion").select("id").eq("athlete_id", athleteId).eq("rule_type", suggestion.rule_type).gte("created_at", cutoffDate.toISOString()).limit(1);
  return !error && data && data.length > 0;
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, key + "" , value);
class RuleEngine {
  constructor(rules = []) {
    __publicField(this, "rules", []);
    this.rules = rules;
  }
  addRule(rule) {
    this.rules.push(rule);
  }
  async evaluateAll(context) {
    const suggestions = [];
    for (const rule of this.rules) {
      try {
        const result = await rule.evaluate(context);
        if (result) {
          suggestions.push(result);
        }
      } catch (error) {
        console.error(`Rule ${rule.id} failed:`, error);
      }
    }
    return suggestions;
  }
  async generateSuggestions(supabase, athleteId, context) {
    const suggestions = await this.evaluateAll(context);
    let insertedCount = 0;
    for (const suggestion of suggestions) {
      const isDuplicate = await isDuplicateSuggestion(
        supabase,
        athleteId,
        suggestion
      );
      if (!isDuplicate) {
        const { error } = await supabase.from("suggestion").insert({
          athlete_id: athleteId,
          ...suggestion,
          pending_surface: true
        });
        if (!error) {
          insertedCount++;
        } else {
          console.error("Failed to insert suggestion:", error);
        }
      }
    }
    return insertedCount;
  }
}

const interactionGapRule = {
  id: "interaction-gap",
  name: "Interaction Gap Detected",
  description: "Priority school has not been contacted in 21+ days",
  async evaluate(context) {
    const prioritySchools = context.schools.filter(
      (s) => ["A", "B"].includes(s.priority) && ["interested", "contacted", "visited"].includes(s.status)
    );
    for (const school of prioritySchools) {
      const lastInteraction = context.interactions.filter((i) => i.school_id === school.id).sort((a, b) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime())[0];
      const daysSinceContact = lastInteraction ? Math.floor((Date.now() - new Date(lastInteraction.interaction_date).getTime()) / (1e3 * 60 * 60 * 24)) : 999;
      if (daysSinceContact >= 21) {
        return {
          rule_type: "interaction-gap",
          urgency: "high",
          message: `It's been ${daysSinceContact} days since you contacted ${school.name}. Stay on their radar!`,
          action_type: "log_interaction",
          related_school_id: school.id
        };
      }
    }
    return null;
  }
};

const missingVideoRule = {
  id: "missing-video",
  name: "Missing Highlight Video",
  description: "Athlete is sophomore or beyond without highlight video",
  async evaluate(context) {
    const gradeLevel = context.athlete.grade_level || 9;
    const hasVideos = context.videos.length > 0;
    if (gradeLevel >= 10 && !hasVideos) {
      return {
        rule_type: "missing-video",
        urgency: "medium",
        message: "Create a highlight video to showcase your skills to coaches",
        action_type: "add_video"
      };
    }
    return null;
  }
};

const eventFollowUpRule = {
  id: "event-follow-up",
  name: "Event Follow-Up Needed",
  description: "Attended event but no follow-up interaction logged",
  async evaluate(context) {
    const recentEvents = context.events.filter((e) => {
      const eventDate = new Date(e.event_date);
      const daysSince = Math.floor((Date.now() - eventDate.getTime()) / (1e3 * 60 * 60 * 24));
      return e.attended && daysSince <= 7;
    });
    for (const event of recentEvents) {
      const hasFollowUp = context.interactions.some((i) => {
        const interactionDate = new Date(i.interaction_date);
        const eventDate = new Date(event.event_date);
        return i.related_event_id === event.id || interactionDate > eventDate;
      });
      if (!hasFollowUp) {
        return {
          rule_type: "event-follow-up",
          urgency: "medium",
          message: `Follow up on ${event.name} with a thank-you email to coaches you met`,
          action_type: "log_interaction",
          related_school_id: event.school_id
        };
      }
    }
    return null;
  }
};

const videoLinkHealthRule = {
  id: "video-link-health",
  name: "Broken Video Link",
  description: "Video URL is not accessible",
  async evaluate(context) {
    for (const video of context.videos) {
      if (video.health_status === "broken") {
        return {
          rule_type: "video-link-health",
          urgency: "high",
          message: `Your video "${video.title}" link is broken. Update it immediately.`,
          action_type: "update_video"
        };
      }
    }
    return null;
  }
};

const portfolioHealthRule = {
  id: "portfolio-health",
  name: "Portfolio Health Issue",
  description: "All schools are unlikely fits",
  async evaluate(context) {
    if (context.schools.length === 0) return null;
    const allUnlikely = context.schools.every((s) => (s.fit_score || 0) < 50);
    if (allUnlikely) {
      return {
        rule_type: "portfolio-health",
        urgency: "high",
        message: "Your school list has no strong matches. Add schools that align better with your profile.",
        action_type: "add_school"
      };
    }
    return null;
  }
};

const prioritySchoolReminderRule = {
  id: "priority-school-reminder",
  name: "Priority School Check-In",
  description: "Top priority school needs attention",
  async evaluate(context) {
    const priorityASchools = context.schools.filter((s) => s.priority === "A");
    for (const school of priorityASchools) {
      const lastInteraction = context.interactions.filter((i) => i.school_id === school.id).sort((a, b) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime())[0];
      const daysSinceContact = lastInteraction ? Math.floor((Date.now() - new Date(lastInteraction.interaction_date).getTime()) / (1e3 * 60 * 60 * 24)) : 999;
      if (daysSinceContact >= 14) {
        return {
          rule_type: "priority-school-reminder",
          urgency: "high",
          message: `${school.name} is your top priority. Check in with coaches this week.`,
          action_type: "log_interaction",
          related_school_id: school.id
        };
      }
    }
    return null;
  }
};

const evaluate_post = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  await assertNotParent(user.id, supabase);
  const athleteId = user.id;
  try {
    const [athlete, schools, interactions, tasks, athleteTasks, videos, events] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", athleteId).single(),
      supabase.from("schools").select("*").eq("athlete_id", athleteId),
      supabase.from("interactions").select("*").eq("athlete_id", athleteId),
      supabase.from("task").select("*"),
      supabase.from("athlete_task").select("*").eq("athlete_id", athleteId),
      supabase.from("videos").select("*").eq("athlete_id", athleteId),
      supabase.from("events").select("*").eq("athlete_id", athleteId)
    ]);
    const context = {
      athleteId,
      athlete: athlete.data,
      schools: schools.data || [],
      interactions: interactions.data || [],
      tasks: tasks.data || [],
      athleteTasks: athleteTasks.data || [],
      videos: videos.data || [],
      events: events.data || []
    };
    const engine = new RuleEngine([
      interactionGapRule,
      missingVideoRule,
      eventFollowUpRule,
      videoLinkHealthRule,
      portfolioHealthRule,
      prioritySchoolReminderRule
    ]);
    const count = await engine.generateSuggestions(supabase, athleteId, context);
    return { generated: count };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to evaluate suggestions"
    });
  }
});

export { evaluate_post as default };
//# sourceMappingURL=evaluate.post.mjs.map
