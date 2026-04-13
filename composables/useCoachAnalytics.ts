import { useInteractions } from "./useInteractions";
import { useCoaches } from "./useCoaches";

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

export const useCoachAnalytics = () => {
  const { interactions } = useInteractions();
  const { coaches } = useCoaches();

  /**
   * Calculate metrics for a specific coach
   */
  const calculateCoachMetrics = (coachId: string): CoachMetrics => {
    const coachInteractions = interactions.value.filter(
      (i) => i.coach_id === coachId,
    );

    const outboundCount = coachInteractions.filter(
      (i) => i.direction === "outbound",
    ).length;
    const inboundCount = coachInteractions.filter(
      (i) => i.direction === "inbound",
    ).length;

    // Response rate: inbound / outbound
    const responseRate =
      outboundCount > 0 ? (inboundCount / outboundCount) * 100 : 0;

    // Average response time: time between outbound and next inbound
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
        ? Math.round(
            (totalResponseTime / responseCount / (1000 * 60 * 60)) * 10,
          ) / 10
        : 0;

    // Last contact date
    const lastContact =
      coachInteractions.length > 0
        ? coachInteractions[0].occurred_at || null
        : null;
    const daysSinceContact = lastContact
      ? Math.floor(
          (Date.now() - new Date(lastContact).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : -1;

    // Preferred communication method (most frequent response method)
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
  };

  /**
   * Compare coach metrics against school average
   */
  const compareWithSchoolAverage = (
    coachId: string,
    schoolId: string | undefined,
  ) => {
    if (!schoolId) return null;

    const coachMetrics = calculateCoachMetrics(coachId);
    const schoolCoaches = coaches.value.filter((c) => c.school_id === schoolId);

    const schoolMetrics = schoolCoaches.map((c) => calculateCoachMetrics(c.id));
    const avgResponseRate =
      schoolMetrics.length > 0
        ? Math.round(
            schoolMetrics.reduce((sum, m) => sum + m.responseRate, 0) /
              schoolMetrics.length,
          )
        : 0;

    return {
      coach: coachMetrics,
      schoolAverage: {
        responseRate: avgResponseRate,
      },
      rank:
        schoolMetrics.filter((m) => m.responseRate > coachMetrics.responseRate)
          .length + 1,
      totalCoaches: schoolMetrics.length,
    };
  };

  /**
   * Generate insights and alerts for a coach
   */
  const generateInsights = (coachId: string): string[] => {
    const metrics = calculateCoachMetrics(coachId);
    const insights: string[] = [];

    // No recent contact
    if (metrics.daysSinceContact > 30 && metrics.daysSinceContact >= 0) {
      insights.push(
        `No contact in ${metrics.daysSinceContact} days - consider reaching out`,
      );
    }

    // Response time insight
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

    // Method preference
    if (metrics.preferredMethod && metrics.inboundCount > 0) {
      const methodLabel = metrics.preferredMethod.replace(/_/g, " ");
      insights.push(`Prefers responding via ${methodLabel}`);
    }

    return insights;
  };

  return {
    calculateCoachMetrics,
    compareWithSchoolAverage,
    generateInsights,
  };
};
