import { useInteractions } from "./useInteractions";
import { useCoaches } from "./useCoaches";
import type { Coach, Interaction } from "~/types/models";

export interface CoachMetrics {
  totalInteractions: number;
  responseRate: number; // percentage
  averageResponseTime: number; // in hours
  lastContactDate: string | null;
  daysSinceContact: number;
  preferredMethod: string;
  outboundCount: number;
  inboundCount: number;
}

export interface CoachComparison {
  coach: CoachMetrics;
  schoolAverage: { responseRate: number };
  rank: number;
  totalCoaches: number;
}

/** Pure: metrics for one coach from an interactions array. Safe on empty/partial data. */
export function calcCoachMetrics(
  interactions: Interaction[],
  coachId: string,
): CoachMetrics {
  const coachInteractions = interactions.filter((i) => i.coach_id === coachId);

  const outboundCount = coachInteractions.filter(
    (i) => i.direction === "outbound",
  ).length;
  const inboundCount = coachInteractions.filter(
    (i) => i.direction === "inbound",
  ).length;

  // Response rate: inbound / outbound
  const responseRate =
    outboundCount > 0 ? (inboundCount / outboundCount) * 100 : 0;

  // Average response time: time between an outbound and the next inbound.
  let totalResponseTime = 0;
  let responseCount = 0;
  for (let i = 0; i < coachInteractions.length - 1; i++) {
    const current = coachInteractions[i];
    if (current.direction === "outbound" && current.occurred_at) {
      const nextInbound = coachInteractions
        .slice(i + 1)
        .find((x) => x.direction === "inbound" && x.occurred_at);
      if (nextInbound && nextInbound.occurred_at) {
        const responseMs =
          new Date(nextInbound.occurred_at).getTime() -
          new Date(current.occurred_at).getTime();
        totalResponseTime += responseMs;
        responseCount++;
      }
    }
  }
  const averageResponseTime =
    responseCount > 0
      ? Math.round((totalResponseTime / responseCount / (1000 * 60 * 60)) * 10) /
        10
      : 0;

  const lastContact =
    coachInteractions.length > 0
      ? coachInteractions[0].occurred_at || null
      : null;
  const daysSinceContact = lastContact
    ? Math.floor(
        (Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24),
      )
    : -1;

  // Preferred communication method = most frequent inbound type.
  const methodCounts: Record<string, number> = {};
  coachInteractions
    .filter((i) => i.direction === "inbound")
    .forEach((i) => {
      methodCounts[i.type] = (methodCounts[i.type] || 0) + 1;
    });
  const preferredMethod =
    Object.entries(methodCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    "email";

  return {
    totalInteractions: coachInteractions.length,
    responseRate: Math.round(responseRate),
    averageResponseTime,
    lastContactDate: lastContact,
    daysSinceContact,
    preferredMethod,
    outboundCount,
    inboundCount,
  };
}

/** Pure: rank this coach against the school's other coaches by response rate. */
export function compareCoachToSchool(
  interactions: Interaction[],
  coaches: Coach[],
  coachId: string,
  schoolId: string | undefined,
): CoachComparison | null {
  if (!schoolId) return null;

  const coachMetrics = calcCoachMetrics(interactions, coachId);
  const schoolCoaches = coaches.filter((c) => c.school_id === schoolId);
  const schoolMetrics = schoolCoaches.map((c) =>
    calcCoachMetrics(interactions, c.id),
  );

  const avgResponseRate =
    schoolMetrics.length > 0
      ? Math.round(
          schoolMetrics.reduce((sum, m) => sum + m.responseRate, 0) /
            schoolMetrics.length,
        )
      : 0;

  return {
    coach: coachMetrics,
    schoolAverage: { responseRate: avgResponseRate },
    rank:
      schoolMetrics.filter((m) => m.responseRate > coachMetrics.responseRate)
        .length + 1,
    totalCoaches: schoolMetrics.length,
  };
}

/** Pure: human-readable insights derived from a coach's metrics. */
export function coachInsights(
  interactions: Interaction[],
  coachId: string,
): string[] {
  const metrics = calcCoachMetrics(interactions, coachId);
  const insights: string[] = [];

  if (metrics.daysSinceContact > 30 && metrics.daysSinceContact >= 0) {
    insights.push(
      `No contact in ${metrics.daysSinceContact} days - consider reaching out`,
    );
  }

  if (metrics.averageResponseTime > 48) {
    insights.push(
      `Average response time is ${metrics.averageResponseTime} hours - slow responder`,
    );
  } else if (
    metrics.averageResponseTime > 0 &&
    metrics.averageResponseTime < 24
  ) {
    insights.push(
      `Quick responder - average ${metrics.averageResponseTime} hours`,
    );
  }

  if (metrics.preferredMethod && metrics.inboundCount > 0) {
    const methodLabel = metrics.preferredMethod.replace(/_/g, " ");
    insights.push(`Prefers responding via ${methodLabel}`);
  }

  return insights;
}

/**
 * Composable wrapper — binds the pure helpers to the shared interactions/coaches
 * refs. NOTE: `useInteractions()` state is per-instance, so callers that fetch
 * into their own instance should prefer the pure `calc*` functions with their
 * own arrays (see pages/coaches/[id]/index.vue). Kept for existing callers/tests.
 */
export const useCoachAnalytics = () => {
  const { interactions } = useInteractions();
  const { coaches } = useCoaches();

  return {
    calculateCoachMetrics: (coachId: string): CoachMetrics =>
      calcCoachMetrics(interactions.value, coachId),
    compareWithSchoolAverage: (
      coachId: string,
      schoolId: string | undefined,
    ): CoachComparison | null =>
      compareCoachToSchool(interactions.value, coaches.value, coachId, schoolId),
    generateInsights: (coachId: string): string[] =>
      coachInsights(interactions.value, coachId),
  };
};
