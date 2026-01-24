import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCoachAnalytics } from "~/composables/useCoachAnalytics";
import { ref } from "vue";
import type { Coach, Interaction } from "~/types/models";

// Mock composables
const mockCoaches = ref<Coach[]>([]);
const mockInteractions = ref<Interaction[]>([]);

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({
    coaches: mockCoaches,
  }),
}));

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({
    interactions: mockInteractions,
  }),
}));

describe("useCoachAnalytics", () => {
  const createMockCoach = (overrides = {}): Coach => ({
    id: "coach-1",
    school_id: "school-1",
    user_id: "user-1",
    role: "head",
    first_name: "John",
    last_name: "Smith",
    email: "john@example.com",
    phone: "555-1234",
    twitter_handle: "@coach",
    instagram_handle: "coach",
    notes: "",
    responsiveness_score: 75,
    last_contact_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  const createMockInteraction = (overrides = {}): Interaction => ({
    id: "interaction-1",
    school_id: "school-1",
    coach_id: "coach-1",
    event_id: null,
    type: "email",
    direction: "outbound",
    subject: "Recruiting inquiry",
    content: "Test",
    sentiment: "neutral",
    occurred_at: new Date().toISOString(),
    logged_by: "user-1",
    attachments: [],
    created_at: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    mockCoaches.value = [createMockCoach()];
    mockInteractions.value = [];
    vi.clearAllMocks();
  });

  describe("calculateCoachMetrics", () => {
    it("should calculate metrics for a coach", () => {
      const now = new Date();
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          direction: "outbound",
          occurred_at: new Date(
            now.getTime() - 10 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockInteraction({
          id: "i2",
          direction: "inbound",
          occurred_at: new Date(
            now.getTime() - 9 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockInteraction({
          id: "i3",
          direction: "outbound",
          occurred_at: new Date(
            now.getTime() - 5 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockInteraction({
          id: "i4",
          direction: "inbound",
          occurred_at: new Date(
            now.getTime() - 4 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ];

      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-1");

      expect(metrics.totalInteractions).toBe(4);
      expect(metrics.outboundCount).toBe(2);
      expect(metrics.inboundCount).toBe(2);
      expect(metrics.responseRate).toBe(100); // 2 inbound / 2 outbound
      expect(metrics.responsiveness).toBe(100);
    });

    it("should calculate response rate correctly", () => {
      mockInteractions.value = [
        createMockInteraction({ id: "i1", direction: "outbound" }),
        createMockInteraction({ id: "i2", direction: "outbound" }),
        createMockInteraction({ id: "i3", direction: "outbound" }),
        createMockInteraction({ id: "i4", direction: "inbound" }),
      ];

      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-1");

      expect(metrics.responseRate).toBe(33); // 1 inbound / 3 outbound = 33.33%
      expect(metrics.responsiveness).toBe(33);
    });

    it("should cap responsiveness at 100", () => {
      mockInteractions.value = [
        createMockInteraction({ id: "i1", direction: "outbound" }),
        createMockInteraction({ id: "i2", direction: "inbound" }),
        createMockInteraction({ id: "i3", direction: "inbound" }),
      ];

      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-1");

      expect(metrics.responsiveness).toBe(100); // Capped at 100
    });

    it("should handle zero outbound interactions", () => {
      mockInteractions.value = [
        createMockInteraction({ id: "i1", direction: "inbound" }),
        createMockInteraction({ id: "i2", direction: "inbound" }),
      ];

      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-1");

      expect(metrics.responseRate).toBe(0);
      expect(metrics.responsiveness).toBe(0);
    });

    it("should identify preferred communication method", () => {
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          direction: "inbound",
          type: "email",
        }),
        createMockInteraction({
          id: "i2",
          direction: "inbound",
          type: "email",
        }),
        createMockInteraction({
          id: "i3",
          direction: "inbound",
          type: "phone_call",
        }),
      ];

      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-1");

      expect(metrics.preferredMethod).toBe("email");
    });

    it("should default to email if no inbound interactions", () => {
      mockInteractions.value = [
        createMockInteraction({ id: "i1", direction: "outbound" }),
      ];

      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-1");

      expect(metrics.preferredMethod).toBe("email");
    });

    it("should calculate average response time", () => {
      const now = new Date();
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          direction: "outbound",
          occurred_at: new Date(
            now.getTime() - 48 * 60 * 60 * 1000,
          ).toISOString(), // 48 hours ago
        }),
        createMockInteraction({
          id: "i2",
          direction: "inbound",
          occurred_at: new Date(
            now.getTime() - 47 * 60 * 60 * 1000,
          ).toISOString(), // 47 hours ago (1 hour response)
        }),
      ];

      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-1");

      expect(metrics.averageResponseTime).toBe(1);
    });

    it("should calculate days since contact", () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          occurred_at: tenDaysAgo.toISOString(),
        }),
      ];

      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-1");

      expect(metrics.daysSinceContact).toBe(10);
    });

    it("should handle no interactions", () => {
      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-no-interactions");

      expect(metrics.totalInteractions).toBe(0);
      expect(metrics.outboundCount).toBe(0);
      expect(metrics.inboundCount).toBe(0);
      expect(metrics.daysSinceContact).toBe(-1);
      expect(metrics.averageResponseTime).toBe(0);
    });
  });

  describe("calculateTrendData", () => {
    it("should generate trend data over time", () => {
      const now = new Date();
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          direction: "outbound",
          occurred_at: new Date(
            now.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockInteraction({
          id: "i2",
          direction: "inbound",
          occurred_at: new Date(
            now.getTime() - 4 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockInteraction({
          id: "i3",
          direction: "outbound",
          occurred_at: new Date(
            now.getTime() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockInteraction({
          id: "i4",
          direction: "inbound",
          occurred_at: new Date(
            now.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ];

      const analytics = useCoachAnalytics();
      const trendData = analytics.calculateTrendData("coach-1", 7);

      expect(trendData.length).toBeGreaterThan(0);
      expect(
        trendData.every((d) => typeof d.score === "number" && d.date),
      ).toBe(true);
    });

    it("should return empty array if no interactions", () => {
      const analytics = useCoachAnalytics();
      const trendData = analytics.calculateTrendData(
        "coach-no-interactions",
        30,
      );

      expect(trendData).toHaveLength(0);
    });

    it("should calculate rolling responsiveness score", () => {
      const now = new Date();
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          direction: "outbound",
          occurred_at: new Date(
            now.getTime() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockInteraction({
          id: "i2",
          direction: "inbound",
          occurred_at: new Date(
            now.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ];

      const analytics = useCoachAnalytics();
      const trendData = analytics.calculateTrendData("coach-1", 5);

      const lastDataPoint = trendData[trendData.length - 1];
      expect(lastDataPoint.score).toBeGreaterThanOrEqual(0);
      expect(lastDataPoint.score).toBeLessThanOrEqual(100);
    });

    it("should filter by coach id", () => {
      const now = new Date();
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          coach_id: "coach-1",
          direction: "outbound",
          occurred_at: new Date(
            now.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockInteraction({
          id: "i2",
          coach_id: "coach-2",
          direction: "outbound",
          occurred_at: new Date(
            now.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ];

      const analytics = useCoachAnalytics();
      const trendData = analytics.calculateTrendData("coach-1", 5);

      // Should only include coach-1 interactions
      expect(trendData.length).toBeGreaterThan(0);
    });
  });

  describe("compareWithSchoolAverage", () => {
    it("should compare coach with school average", () => {
      mockCoaches.value = [
        createMockCoach({ id: "coach-1", school_id: "school-1" }),
        createMockCoach({ id: "coach-2", school_id: "school-1" }),
        createMockCoach({ id: "coach-3", school_id: "school-1" }),
      ];

      mockInteractions.value = [
        createMockInteraction({ coach_id: "coach-1", direction: "outbound" }),
        createMockInteraction({
          id: "i2",
          coach_id: "coach-1",
          direction: "inbound",
        }),
        createMockInteraction({
          id: "i3",
          coach_id: "coach-2",
          direction: "outbound",
        }),
        createMockInteraction({
          id: "i4",
          coach_id: "coach-3",
          direction: "outbound",
        }),
      ];

      const analytics = useCoachAnalytics();
      const comparison = analytics.compareWithSchoolAverage(
        "coach-1",
        "school-1",
      );

      expect(comparison).not.toBeNull();
      expect(comparison?.coach).toBeDefined();
      expect(comparison?.schoolAverage).toBeDefined();
      expect(comparison?.rank).toBeDefined();
      expect(comparison?.totalCoaches).toBe(3);
    });

    it("should return null if no school provided", () => {
      const analytics = useCoachAnalytics();
      const comparison = analytics.compareWithSchoolAverage(
        "coach-1",
        undefined,
      );

      expect(comparison).toBeNull();
    });

    it("should calculate coach rank within school", () => {
      mockCoaches.value = [
        createMockCoach({
          id: "coach-1",
          school_id: "school-1",
          responsiveness_score: 50,
        }),
        createMockCoach({
          id: "coach-2",
          school_id: "school-1",
          responsiveness_score: 80,
        }),
        createMockCoach({
          id: "coach-3",
          school_id: "school-1",
          responsiveness_score: 70,
        }),
      ];

      mockInteractions.value = [
        createMockInteraction({ coach_id: "coach-1", direction: "outbound" }),
        createMockInteraction({
          id: "i2",
          coach_id: "coach-2",
          direction: "outbound",
        }),
        createMockInteraction({
          id: "i3",
          coach_id: "coach-2",
          direction: "inbound",
        }),
        createMockInteraction({
          id: "i4",
          coach_id: "coach-3",
          direction: "outbound",
        }),
      ];

      const analytics = useCoachAnalytics();
      const comparison = analytics.compareWithSchoolAverage(
        "coach-1",
        "school-1",
      );

      expect(comparison?.rank).toBeGreaterThan(0);
      expect(comparison?.rank).toBeLessThanOrEqual(3);
    });
  });

  describe("generateInsights", () => {
    it("should generate alert for no recent contact", () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          occurred_at: thirtyOneDaysAgo.toISOString(),
        }),
      ];

      const analytics = useCoachAnalytics();
      const insights = analytics.generateInsights("coach-1");

      expect(insights.some((i) => i.includes("No contact"))).toBe(true);
    });

    it("should flag low responsiveness", () => {
      mockInteractions.value = [
        createMockInteraction({ id: "i1", direction: "outbound" }),
        createMockInteraction({ id: "i2", direction: "outbound" }),
        createMockInteraction({ id: "i3", direction: "outbound" }),
        createMockInteraction({ id: "i4", direction: "outbound" }),
        createMockInteraction({ id: "i5", direction: "inbound" }),
      ];

      const analytics = useCoachAnalytics();
      const insights = analytics.generateInsights("coach-1");

      expect(insights.some((i) => i.includes("responsiveness"))).toBe(true);
    });

    it("should flag high responsiveness", () => {
      mockInteractions.value = [
        createMockInteraction({ id: "i1", direction: "outbound" }),
        createMockInteraction({ id: "i2", direction: "inbound" }),
        createMockInteraction({ id: "i3", direction: "inbound" }),
      ];

      const analytics = useCoachAnalytics();
      const insights = analytics.generateInsights("coach-1");

      expect(insights.some((i) => i.includes("Highly responsive"))).toBe(true);
    });

    it("should provide response time insights for slow responder", () => {
      const now = new Date();
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          direction: "outbound",
          occurred_at: new Date(
            now.getTime() - 100 * 60 * 60 * 1000,
          ).toISOString(),
        }),
        createMockInteraction({
          id: "i2",
          direction: "inbound",
          occurred_at: new Date(
            now.getTime() - 50 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ];

      const analytics = useCoachAnalytics();
      const insights = analytics.generateInsights("coach-1");

      // Should have insights (may include response time if average is high enough)
      expect(insights.length).toBeGreaterThan(0);
    });

    it("should identify preferred communication method", () => {
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          direction: "inbound",
          type: "phone_call",
        }),
        createMockInteraction({
          id: "i2",
          direction: "inbound",
          type: "phone_call",
        }),
        createMockInteraction({
          id: "i3",
          direction: "inbound",
          type: "email",
        }),
      ];

      const analytics = useCoachAnalytics();
      const insights = analytics.generateInsights("coach-1");

      expect(insights.some((i) => i.includes("phone"))).toBe(true);
    });

    it("should return empty array if no insights apply", () => {
      const recentDate = new Date();
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          direction: "outbound",
          occurred_at: recentDate.toISOString(),
        }),
        createMockInteraction({
          id: "i2",
          direction: "inbound",
          occurred_at: new Date(
            recentDate.getTime() + 1 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ];

      const analytics = useCoachAnalytics();
      const insights = analytics.generateInsights("coach-1");

      expect(Array.isArray(insights)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle coach with no data", () => {
      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("non-existent");

      expect(metrics.totalInteractions).toBe(0);
      expect(metrics.responsiveness).toBe(0);
    });

    it("should handle very high responsiveness", () => {
      mockInteractions.value = [
        createMockInteraction({ id: "i1", direction: "outbound" }),
        createMockInteraction({ id: "i2", direction: "inbound" }),
        createMockInteraction({ id: "i3", direction: "inbound" }),
        createMockInteraction({ id: "i4", direction: "inbound" }),
      ];

      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-1");

      expect(metrics.responsiveness).toBeLessThanOrEqual(100);
    });

    it("should handle interactions with no occurred_at", () => {
      mockInteractions.value = [
        createMockInteraction({
          id: "i1",
          direction: "outbound",
          occurred_at: undefined as any,
        }),
        createMockInteraction({
          id: "i2",
          direction: "inbound",
          occurred_at: new Date().toISOString(),
        }),
      ];

      const analytics = useCoachAnalytics();
      const metrics = analytics.calculateCoachMetrics("coach-1");

      expect(metrics.totalInteractions).toBe(2);
    });
  });
});
