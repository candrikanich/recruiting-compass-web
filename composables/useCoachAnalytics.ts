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
  responsiveness: number; // 0-100
}

export interface TrendDataPoint {
  date: string;
  score: number;
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

    // Responsiveness score (same calculation as coachResponsiveness.ts)
    const responsiveness =
      outboundCount > 0 ? Math.min(Math.round(responseRate), 100) : 0;

    return {
      totalInteractions: coachInteractions.length,
      responseRate: Math.round(responseRate),
      averageResponseTime,
      lastContactDate: lastContact,
      daysSinceContact,
      preferredMethod,
      outboundCount,
      inboundCount,
      responsiveness,
    };
  };

  /**
   * Generate trend data for a coach over time
   */
  const calculateTrendData = (
    coachId: string,
    days: number = 90,
  ): TrendDataPoint[] => {
    const coachInteractions = interactions.value
      .filter((i) => i.coach_id === coachId && i.occurred_at)
      .sort(
        (a, b) =>
          new Date(a.occurred_at!).getTime() -
          new Date(b.occurred_at!).getTime(),
      );

    if (coachInteractions.length === 0) return [];

    const trendData: TrendDataPoint[] = [];
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Create daily buckets
    const dailyData: Record<string, { outbound: number; inbound: number }> = {};
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      dailyData[dateStr] = { outbound: 0, inbound: 0 };
    }

    // Count interactions by day
    coachInteractions.forEach((interaction) => {
      const date = new Date(interaction.occurred_at!)
        .toISOString()
        .split("T")[0];
      if (dailyData[date]) {
        if (interaction.direction === "outbound") {
          dailyData[date].outbound++;
        } else {
          dailyData[date].inbound++;
        }
      }
    });

    // Calculate rolling responsiveness score
    let cumulativeOutbound = 0;
    let cumulativeInbound = 0;

    Object.entries(dailyData)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .forEach(([date, { outbound, inbound }]) => {
        cumulativeOutbound += outbound;
        cumulativeInbound += inbound;

        const score =
          cumulativeOutbound > 0
            ? Math.min(
                Math.round((cumulativeInbound / cumulativeOutbound) * 100),
                100,
              )
            : 0;

        trendData.push({
          date,
          score,
        });
      });

    return trendData;
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
    const avgResponsiveness =
      schoolMetrics.length > 0
        ? Math.round(
            schoolMetrics.reduce((sum, m) => sum + m.responsiveness, 0) /
              schoolMetrics.length,
          )
        : 0;

    return {
      coach: coachMetrics,
      schoolAverage: {
        responseRate: avgResponseRate,
        responsiveness: avgResponsiveness,
      },
      rank:
        schoolMetrics.filter(
          (m) => m.responsiveness > coachMetrics.responsiveness,
        ).length + 1,
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

    // Low responsiveness
    if (metrics.responsiveness < 25) {
      insights.push(
        "Very low responsiveness - this coach rarely responds to outreach",
      );
    } else if (metrics.responsiveness < 50) {
      insights.push(
        "Low responsiveness - consider trying a different communication method",
      );
    }

    // High responsiveness
    if (metrics.responsiveness >= 75) {
      insights.push("Highly responsive coach - good engagement");
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
    calculateTrendData,
    compareWithSchoolAverage,
    generateInsights,
  };
};
