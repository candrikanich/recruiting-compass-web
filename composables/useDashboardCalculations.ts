/**
 * useDashboardCalculations Composable
 * Extracted computed calculations for dashboard statistics
 * Accepts dashboard data and returns computed metrics
 */

import { computed } from "vue";
import type { ComputedRef } from "vue";
import {
  calculateSchoolSizeBreakdown,
  calculateContactsThisMonth,
  calculateTotalOffers,
  calculateAcceptedOffers,
  calculateATierSchoolCount,
  getUpcomingEvents,
  getTopMetrics,
} from "~/utils/dashboardCalculations";
import type {
  School,
  Interaction,
  Offer,
  Event,
  PerformanceMetric,
} from "~/types/models";

interface DashboardData {
  allSchools: { value: School[] };
  allInteractions: { value: Interaction[] };
  allOffers: { value: Offer[] };
  allEvents: { value: Event[] };
  allMetrics: { value: PerformanceMetric[] };
}

interface DashboardCalculations {
  schoolSizeBreakdown: ComputedRef<Record<string, number>>;
  contactsThisMonth: ComputedRef<number>;
  totalOffers: ComputedRef<number>;
  acceptedOffers: ComputedRef<number>;
  aTierSchoolCount: ComputedRef<number>;
  upcomingEvents: ComputedRef<Event[]>;
  topMetrics: ComputedRef<PerformanceMetric[]>;
}

/**
 * Calculate dashboard metrics from dashboard data
 * @param dashboardData - Result from useDashboardData() composable
 * @returns Object containing computed statistics
 */
export const useDashboardCalculations = (
  dashboardData: DashboardData,
): DashboardCalculations => {
  const schoolSizeBreakdown = computed(() =>
    calculateSchoolSizeBreakdown(dashboardData.allSchools.value),
  );

  const contactsThisMonth = computed(() =>
    calculateContactsThisMonth(dashboardData.allInteractions.value),
  );

  const totalOffers = computed(() =>
    calculateTotalOffers(dashboardData.allOffers.value),
  );

  const acceptedOffers = computed(() =>
    calculateAcceptedOffers(dashboardData.allOffers.value),
  );

  const aTierSchoolCount = computed(() =>
    calculateATierSchoolCount(dashboardData.allSchools.value),
  );

  const upcomingEvents = computed(() =>
    getUpcomingEvents(dashboardData.allEvents.value),
  );

  const topMetrics = computed(() =>
    getTopMetrics(dashboardData.allMetrics.value, 3),
  );

  return {
    schoolSizeBreakdown,
    contactsThisMonth,
    totalOffers,
    acceptedOffers,
    aTierSchoolCount,
    upcomingEvents,
    topMetrics,
  };
};
