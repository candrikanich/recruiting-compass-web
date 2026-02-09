/**
 * Tests for useDashboardCalculations composable
 */

import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useDashboardCalculations } from "~/composables/useDashboardCalculations";
import type {
  School,
  Interaction,
  Offer,
  Event,
  PerformanceMetric,
} from "~/types/models";

describe("useDashboardCalculations", () => {
  it("should return all computed properties", () => {
    const mockDashboardData = {
      allSchools: ref<School[]>([]),
      allInteractions: ref<Interaction[]>([]),
      allOffers: ref<Offer[]>([]),
      allEvents: ref<Event[]>([]),
      allMetrics: ref<PerformanceMetric[]>([]),
    };

    const calculations = useDashboardCalculations(mockDashboardData);

    expect(calculations).toHaveProperty("schoolSizeBreakdown");
    expect(calculations).toHaveProperty("contactsThisMonth");
    expect(calculations).toHaveProperty("totalOffers");
    expect(calculations).toHaveProperty("acceptedOffers");
    expect(calculations).toHaveProperty("aTierSchoolCount");
    expect(calculations).toHaveProperty("upcomingEvents");
    expect(calculations).toHaveProperty("topMetrics");
  });

  it("should calculate school size breakdown", () => {
    const schools: School[] = [
      {
        id: "1",
        name: "Large School",
        academic_info: { student_size: 30000 },
      } as School,
      {
        id: "2",
        name: "Small School",
        academic_info: { student_size: 2000 },
      } as School,
    ];

    const mockDashboardData = {
      allSchools: ref(schools),
      allInteractions: ref<Interaction[]>([]),
      allOffers: ref<Offer[]>([]),
      allEvents: ref<Event[]>([]),
      allMetrics: ref<PerformanceMetric[]>([]),
    };

    const { schoolSizeBreakdown } = useDashboardCalculations(mockDashboardData);

    expect(schoolSizeBreakdown.value).toBeDefined();
    expect(typeof schoolSizeBreakdown.value).toBe("object");
  });

  it("should calculate total offers", () => {
    const offers: Offer[] = [
      { id: "1", status: "accepted" } as Offer,
      { id: "2", status: "pending" } as Offer,
      { id: "3", status: "rejected" } as Offer,
    ];

    const mockDashboardData = {
      allSchools: ref<School[]>([]),
      allInteractions: ref<Interaction[]>([]),
      allOffers: ref(offers),
      allEvents: ref<Event[]>([]),
      allMetrics: ref<PerformanceMetric[]>([]),
    };

    const { totalOffers } = useDashboardCalculations(mockDashboardData);

    expect(totalOffers.value).toBe(3);
  });

  it("should calculate accepted offers", () => {
    const offers: Offer[] = [
      { id: "1", status: "accepted" } as Offer,
      { id: "2", status: "accepted" } as Offer,
      { id: "3", status: "rejected" } as Offer,
    ];

    const mockDashboardData = {
      allSchools: ref<School[]>([]),
      allInteractions: ref<Interaction[]>([]),
      allOffers: ref(offers),
      allEvents: ref<Event[]>([]),
      allMetrics: ref<PerformanceMetric[]>([]),
    };

    const { acceptedOffers } = useDashboardCalculations(mockDashboardData);

    expect(acceptedOffers.value).toBe(2);
  });

  it("should calculate A-tier school count", () => {
    const schools: School[] = [
      { id: "1", priority_tier: "A" } as School,
      { id: "2", priority_tier: "B" } as School,
      { id: "3", priority_tier: "A" } as School,
    ];

    const mockDashboardData = {
      allSchools: ref(schools),
      allInteractions: ref<Interaction[]>([]),
      allOffers: ref<Offer[]>([]),
      allEvents: ref<Event[]>([]),
      allMetrics: ref<PerformanceMetric[]>([]),
    };

    const { aTierSchoolCount } = useDashboardCalculations(mockDashboardData);

    expect(aTierSchoolCount.value).toBe(2);
  });

  it("should get upcoming events sorted by date", () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const events: Event[] = [
      { id: "1", start_date: nextWeek.toISOString() } as Event,
      { id: "2", start_date: yesterday.toISOString() } as Event,
      { id: "3", start_date: tomorrow.toISOString() } as Event,
    ];

    const mockDashboardData = {
      allSchools: ref<School[]>([]),
      allInteractions: ref<Interaction[]>([]),
      allOffers: ref<Offer[]>([]),
      allEvents: ref(events),
      allMetrics: ref<PerformanceMetric[]>([]),
    };

    const { upcomingEvents } = useDashboardCalculations(mockDashboardData);

    expect(upcomingEvents.value.length).toBe(2);
    expect(upcomingEvents.value[0].id).toBe("3");
    expect(upcomingEvents.value[1].id).toBe("1");
  });

  it("should return top N metrics", () => {
    const metrics: PerformanceMetric[] = [
      { id: "1" } as PerformanceMetric,
      { id: "2" } as PerformanceMetric,
      { id: "3" } as PerformanceMetric,
      { id: "4" } as PerformanceMetric,
    ];

    const mockDashboardData = {
      allSchools: ref<School[]>([]),
      allInteractions: ref<Interaction[]>([]),
      allOffers: ref<Offer[]>([]),
      allEvents: ref<Event[]>([]),
      allMetrics: ref(metrics),
    };

    const { topMetrics } = useDashboardCalculations(mockDashboardData);

    expect(topMetrics.value.length).toBe(3);
    expect(topMetrics.value[0].id).toBe("1");
    expect(topMetrics.value[2].id).toBe("3");
  });

  it("should reactively update when dashboard data changes", async () => {
    const allOffers = ref<Offer[]>([]);

    const mockDashboardData = {
      allSchools: ref<School[]>([]),
      allInteractions: ref<Interaction[]>([]),
      allOffers,
      allEvents: ref<Event[]>([]),
      allMetrics: ref<PerformanceMetric[]>([]),
    };

    const { totalOffers } = useDashboardCalculations(mockDashboardData);

    expect(totalOffers.value).toBe(0);

    allOffers.value = [
      { id: "1", status: "pending" } as Offer,
      { id: "2", status: "accepted" } as Offer,
    ];

    expect(totalOffers.value).toBe(2);
  });
});
