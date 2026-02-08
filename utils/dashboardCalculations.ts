/**
 * Dashboard Calculations
 * Pure utility functions for dashboard statistics and computations
 */

import { getCarnegieSize } from "./schoolSize";
import type { School, Interaction, Offer } from "~/types/models";

/**
 * Calculate school size breakdown by Carnegie classification
 */
export const calculateSchoolSizeBreakdown = (
  schools: School[],
): Record<string, number> => {
  const breakdown: Record<string, number> = {
    "Very Small": 0,
    Small: 0,
    Medium: 0,
    Large: 0,
    "Very Large": 0,
  };

  schools.forEach((school) => {
    const studentSize = school.academic_info?.student_size;
    if (studentSize) {
      const size = getCarnegieSize(
        typeof studentSize === "number" ? studentSize : null,
      );
      if (size && size in breakdown) {
        breakdown[size]++;
      }
    }
  });

  return breakdown;
};

/**
 * Calculate number of contacts made this month
 */
export const calculateContactsThisMonth = (
  interactions: Interaction[],
): number => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return interactions.filter((interaction) => {
    const interactionDate = new Date(
      interaction.occurred_at || interaction.created_at || "",
    );
    return interactionDate >= startOfMonth && interactionDate <= now;
  }).length;
};

/**
 * Calculate total offers
 */
export const calculateTotalOffers = (offers: Offer[]): number => {
  return offers.length;
};

/**
 * Calculate accepted offers
 */
export const calculateAcceptedOffers = (offers: Offer[]): number => {
  return offers.filter((offer) => offer.status === "accepted").length;
};

/**
 * Calculate A-tier school count
 */
export const calculateATierSchoolCount = (schools: School[]): number => {
  return schools.filter((school) => school.priority_tier === "A").length;
};

/**
 * Get upcoming events (sorted by date, limited to 5)
 */
export const getUpcomingEvents = <T extends { start_date: string }>(
  events: T[],
): T[] => {
  const now = new Date();
  return events
    .filter((event) => new Date(event.start_date) >= now)
    .sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    )
    .slice(0, 5);
};

/**
 * Get top N performance metrics
 */
export const getTopMetrics = <T>(metrics: T[], count: number = 3): T[] => {
  return metrics.slice(0, count);
};
