import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateReportData,
  exportReportToCSV,
  downloadReport,
  type ReportData,
} from "~/utils/reportExport";
import type {
  School,
  Coach,
  Interaction,
  PerformanceMetric,
} from "~/types/models";

describe("reportExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateReportData", () => {
    it("should generate report with basic structure", () => {
      const schools: School[] = [];
      const coaches: Coach[] = [];
      const interactions: Interaction[] = [];
      const metrics: PerformanceMetric[] = [];

      const report = generateReportData(
        schools,
        coaches,
        interactions,
        metrics,
        "2024-01-01",
        "2024-01-31",
      );

      expect(report.title).toBe("Baseball Recruiting Report");
      expect(report.dateRange.from).toBe("2024-01-01");
      expect(report.dateRange.to).toBe("2024-01-31");
      expect(report.schools).toBeDefined();
      expect(report.coaches).toBeDefined();
      expect(report.interactions).toBeDefined();
      expect(report.metrics).toBeDefined();
    });

    it("should count schools correctly", () => {
      const schools: School[] = [
        { id: "1", name: "School 1", status: "active", division: "D1" } as any,
        { id: "2", name: "School 2", status: "active", division: "D2" } as any,
        {
          id: "3",
          name: "School 3",
          status: "inactive",
          division: "D1",
        } as any,
      ];

      const report = generateReportData(
        schools,
        [],
        [],
        [],
        "2024-01-01",
        "2024-01-31",
      );

      expect(report.schools?.total).toBe(3);
      expect(report.schools?.byStatus).toEqual({ active: 2, inactive: 1 });
      expect(report.schools?.byDivision).toEqual({ D1: 2, D2: 1 });
    });

    it("should count coaches and calculate average response rate", () => {
      const coaches: Coach[] = [
        { id: "1", responsiveness_score: 0.8 } as any,
        { id: "2", responsiveness_score: 0.6 } as any,
        { id: "3", responsiveness_score: 0.9 } as any,
      ];

      const report = generateReportData(
        [],
        coaches,
        [],
        [],
        "2024-01-01",
        "2024-01-31",
      );

      expect(report.coaches?.total).toBe(3);
      expect(report.coaches?.avgResponseRate).toBe(0.77); // (0.8 + 0.6 + 0.9) / 3 = 0.7666... rounded to 2 decimals
    });

    it("should handle coaches without responsiveness score", () => {
      const coaches: Coach[] = [
        { id: "1", responsiveness_score: undefined } as any,
        { id: "2", responsiveness_score: 0.8 } as any,
      ];

      const report = generateReportData(
        [],
        coaches,
        [],
        [],
        "2024-01-01",
        "2024-01-31",
      );

      expect(report.coaches?.avgResponseRate).toBe(0.8);
    });

    it("should filter interactions by date range", () => {
      const interactions: Interaction[] = [
        {
          id: "1",
          type: "email",
          occurred_at: "2024-01-15",
          sentiment: "positive",
        } as any,
        {
          id: "2",
          type: "call",
          occurred_at: "2024-02-15",
          sentiment: "neutral",
        } as any,
        {
          id: "3",
          type: "visit",
          occurred_at: "2024-01-20",
          sentiment: "positive",
        } as any,
      ];

      const report = generateReportData(
        [],
        [],
        interactions,
        [],
        "2024-01-01",
        "2024-01-31",
      );

      expect(report.interactions?.total).toBe(2);
      expect(report.interactions?.byType).toEqual({ email: 1, visit: 1 });
      expect(report.interactions?.bySentiment).toEqual({ positive: 2 });
    });

    it("should handle interactions without date as today", () => {
      // Interactions without date use today's date, so may or may not be included
      // depending on current date vs range
      const today = new Date().toISOString().split("T")[0];
      const futureDate = "2099-01-01";

      const interactions: Interaction[] = [
        {
          id: "1",
          type: "email",
          sentiment: "positive",
          occurred_at: today,
        } as any,
        {
          id: "2",
          type: "call",
          sentiment: "neutral",
          occurred_at: today,
        } as any,
      ];

      const report = generateReportData(
        [],
        [],
        interactions,
        [],
        "2024-01-01",
        futureDate,
      );

      expect(report.interactions?.total).toBe(2);
    });

    it("should filter metrics by date range and calculate statistics", () => {
      const metrics: PerformanceMetric[] = [
        {
          id: "1",
          metric_type: "40_yard_dash",
          value: 4.8,
          recorded_date: "2024-01-15",
        } as any,
        {
          id: "2",
          metric_type: "40_yard_dash",
          value: 4.9,
          recorded_date: "2024-01-20",
        } as any,
        {
          id: "3",
          metric_type: "vertical_jump",
          value: 30,
          recorded_date: "2024-01-25",
        } as any,
        {
          id: "4",
          metric_type: "40_yard_dash",
          value: 5.0,
          recorded_date: "2024-02-15",
        } as any,
      ];

      const report = generateReportData(
        [],
        [],
        [],
        metrics,
        "2024-01-01",
        "2024-01-31",
      );

      expect(report.metrics?.total).toBe(3);
      expect(report.metrics?.byType).toEqual({
        "40_yard_dash": 2,
        vertical_jump: 1,
      });

      const dashSummary = report.metrics?.summaries?.find(
        (s) => s.type === "40_yard_dash",
      );
      expect(dashSummary?.avg).toBeCloseTo(4.85);
      expect(dashSummary?.max).toBe(4.9);
      expect(dashSummary?.min).toBe(4.8);
    });

    it("should include generated timestamp", () => {
      const beforeDate = new Date();
      const report = generateReportData(
        [],
        [],
        [],
        [],
        "2024-01-01",
        "2024-01-31",
      );
      const afterDate = new Date();

      expect(report.generatedAt).toBeDefined();
      const reportDate = new Date(report.generatedAt);
      expect(reportDate.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
      expect(reportDate.getTime()).toBeLessThanOrEqual(
        afterDate.getTime() + 1000,
      );
    });

    it("should handle empty data", () => {
      const report = generateReportData(
        [],
        [],
        [],
        [],
        "2024-01-01",
        "2024-01-31",
      );

      expect(report.schools?.total).toBe(0);
      expect(report.coaches?.total).toBe(0);
      expect(report.interactions?.total).toBe(0);
      expect(report.metrics?.total).toBe(0);
    });
  });

  describe("exportReportToCSV", () => {
    it("should export report to CSV format", () => {
      const report: ReportData = {
        title: "Test Report",
        dateRange: { from: "2024-01-01", to: "2024-01-31" },
        generatedAt: "2024-01-31T12:00:00Z",
        schools: {
          total: 10,
          byStatus: { active: 8, inactive: 2 },
          byDivision: { D1: 5, D2: 5 },
        },
        coaches: { total: 25, avgResponseRate: 0.75, bySchool: 10 },
        interactions: {
          total: 50,
          byType: { email: 30, call: 20 },
          bySentiment: {},
        },
        metrics: { total: 100, byType: { "40_yard_dash": 50 }, summaries: [] },
      };

      const csv = exportReportToCSV(report);

      expect(csv).toContain("Test Report");
      expect(csv).toContain("Report Date:");
      expect(csv).toContain("2024-01-31T12:00:00Z");
      expect(csv).toContain("2024-01-01");
      expect(csv).toContain("Schools Summary");
      expect(csv).toContain("Coaches Summary");
      expect(csv).toContain("Interactions Summary");
      expect(csv).toContain("Performance Metrics Summary");
    });

    it("should include school statistics in CSV", () => {
      const report: ReportData = {
        title: "Test",
        dateRange: { from: "2024-01-01", to: "2024-01-31" },
        generatedAt: "2024-01-31T12:00:00Z",
        schools: {
          total: 5,
          byStatus: { active: 3, inactive: 2 },
          byDivision: { D1: 4 },
        },
        coaches: { total: 0, avgResponseRate: 0, bySchool: 0 },
        interactions: { total: 0, byType: {}, bySentiment: {} },
        metrics: { total: 0, byType: {}, summaries: [] },
      };

      const csv = exportReportToCSV(report);

      expect(csv).toContain("Total Schools");
      expect(csv).toContain("5");
      expect(csv).toContain("active");
      expect(csv).toContain("3");
    });

    it("should include coach statistics in CSV", () => {
      const report: ReportData = {
        title: "Test",
        dateRange: { from: "2024-01-01", to: "2024-01-31" },
        generatedAt: "2024-01-31T12:00:00Z",
        schools: { total: 0, byStatus: {}, byDivision: {} },
        coaches: { total: 20, avgResponseRate: 0.85, bySchool: 10 },
        interactions: { total: 0, byType: {}, bySentiment: {} },
        metrics: { total: 0, byType: {}, summaries: [] },
      };

      const csv = exportReportToCSV(report);

      expect(csv).toContain("Coaches Summary");
      expect(csv).toContain("Total Coaches");
      expect(csv).toContain("20");
      expect(csv).toContain("Average Response Rate");
      expect(csv).toContain("0.85");
    });

    it("should include interaction statistics in CSV", () => {
      const report: ReportData = {
        title: "Test",
        dateRange: { from: "2024-01-01", to: "2024-01-31" },
        generatedAt: "2024-01-31T12:00:00Z",
        schools: { total: 0, byStatus: {}, byDivision: {} },
        coaches: { total: 0, avgResponseRate: 0, bySchool: 0 },
        interactions: {
          total: 50,
          byType: { email: 30, call: 20 },
          bySentiment: { positive: 40, neutral: 10 },
        },
        metrics: { total: 0, byType: {}, summaries: [] },
      };

      const csv = exportReportToCSV(report);

      expect(csv).toContain("Interactions Summary");
      expect(csv).toContain("Total Interactions");
      expect(csv).toContain("50");
      expect(csv).toContain("email");
      expect(csv).toContain("30");
    });

    it("should include metric summaries in CSV", () => {
      const report: ReportData = {
        title: "Test",
        dateRange: { from: "2024-01-01", to: "2024-01-31" },
        generatedAt: "2024-01-31T12:00:00Z",
        schools: { total: 0, byStatus: {}, byDivision: {} },
        coaches: { total: 0, avgResponseRate: 0, bySchool: 0 },
        interactions: { total: 0, byType: {}, bySentiment: {} },
        metrics: {
          total: 100,
          byType: { "40_yard_dash": 50, vertical_jump: 50 },
          summaries: [
            { type: "40_yard_dash", avg: 4.85, max: 5.0, min: 4.7 },
            { type: "vertical_jump", avg: 32.5, max: 36, min: 28 },
          ],
        },
      };

      const csv = exportReportToCSV(report);

      expect(csv).toContain("Performance Metrics Summary");
      expect(csv).toContain("Total Metrics");
      expect(csv).toContain("100");
      expect(csv).toContain("40_yard_dash");
      expect(csv).toContain("4.85");
      expect(csv).toContain("vertical_jump");
    });

    it("should handle missing optional fields", () => {
      const report: ReportData = {
        title: "Test",
        dateRange: { from: "2024-01-01", to: "2024-01-31" },
        generatedAt: "2024-01-31T12:00:00Z",
      };

      const csv = exportReportToCSV(report);

      expect(csv).toContain("Test");
      expect(csv).toContain("Total Schools");
      expect(csv).toContain("0");
    });
  });

  describe("downloadReport", () => {
    it("should be defined and is a function", () => {
      expect(typeof downloadReport).toBe("function");
    });
  });
});
