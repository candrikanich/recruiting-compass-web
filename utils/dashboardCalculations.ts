/**
 * Dashboard Calculations
 * Pure utility functions for dashboard statistics and computations
 */

import { getCarnegieSize } from "./schoolSize";
import type { School, Interaction, Offer } from "~/types/models";
import { getLocalToday, parseLocalDateOnly } from "./localDate";

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
 * Get upcoming events (sorted by date, limited to 5)
 */
export const getUpcomingEvents = <T extends { start_date: string }>(
  events: T[],
): T[] => {
  // `start_date` is a date-only DB column — compare as LOCAL midnight, or
  // today's event drops off the list after ~5-8pm US local time (UTC
  // midnight of "today" has already passed).
  const today = getLocalToday();
  return events
    .filter((event) => parseLocalDateOnly(event.start_date) >= today)
    .sort(
      (a, b) =>
        parseLocalDateOnly(a.start_date).getTime() -
        parseLocalDateOnly(b.start_date).getTime(),
    )
    .slice(0, 5);
};

/**
 * Get top N performance metrics
 */
export const getTopMetrics = <T>(metrics: T[], count: number = 3): T[] => {
  return metrics.slice(0, count);
};
