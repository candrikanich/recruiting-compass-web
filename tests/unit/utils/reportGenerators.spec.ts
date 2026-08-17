import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PerformanceMetric, Event } from "~/types/models";

const makeDoc = () => ({
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  text: vi.fn(),
  addPage: vi.fn(),
  splitTextToSize: vi.fn((t: string) => [t]),
  output: vi.fn(() => "blob"),
});

vi.mock("~/utils/pdfHelpers", () => ({
  initializePDF: vi.fn(async () => makeDoc()),
  addHeader: vi.fn(),
  addFooter: vi.fn(),
  addMetricsTable: vi.fn((_doc: unknown, _m: unknown, y: number) => y + 30),
  addChartImage: vi.fn(
    (_doc: unknown, _img: unknown, _t: unknown, y: number) => y + 100,
  ),
}));

vi.mock("~/utils/textTemplates", () => ({
  generateCoachEmailTemplate: vi.fn(() => "coach-email"),
  generateEventSummaryTemplate: vi.fn(() => "event-summary"),
  getMetricLabel: vi.fn((t: string) => t),
}));

import {
  generateIndividualMetricReport,
  generateComprehensiveReport,
  generateEventReport,
} from "~/utils/reportGenerators";

const metric = (type: string): PerformanceMetric =>
  ({
    recorded_date: "2026-01-15",
    metric_type: type,
    value: 4.5,
    unit: "s",
    verified: true,
  }) as unknown as PerformanceMetric;

describe("reportGenerators", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("generateIndividualMetricReport", () => {
    it("returns a Blob for the pdf format, including the chart branch", async () => {
      const result = await generateIndividualMetricReport("forty_yard", {
        metrics: [metric("forty_yard"), metric("vertical")],
        format: "pdf",
        athleteName: "Jordan",
        chartImage: "data:image/png;base64,xx",
      });
      expect(result).toBe("blob");
    });

    it("returns a text template for the text format", async () => {
      const result = await generateIndividualMetricReport("forty_yard", {
        metrics: [metric("forty_yard")],
        format: "text",
        athleteName: "Jordan",
      });
      expect(result).toBe("coach-email");
    });
  });

  describe("generateComprehensiveReport", () => {
    it("groups metrics by type and returns a Blob for pdf", async () => {
      const result = await generateComprehensiveReport({
        metrics: [metric("forty_yard"), metric("vertical")],
        format: "pdf",
        athleteName: "Jordan",
      });
      expect(result).toBe("blob");
    });

    it("handles the empty-metrics pdf branch", async () => {
      const result = await generateComprehensiveReport({
        metrics: [],
        format: "pdf",
        athleteName: "Jordan",
      });
      expect(result).toBe("blob");
    });

    it("returns a text template for the text format", async () => {
      const result = await generateComprehensiveReport({
        metrics: [metric("forty_yard")],
        format: "text",
        athleteName: "Jordan",
      });
      expect(result).toBe("coach-email");
    });
  });

  describe("generateEventReport", () => {
    const event = {
      name: "Showcase",
      start_date: "2026-02-01",
      location: "Field 3",
      performance_notes: "Strong outing.",
    } as unknown as Event;

    it("returns a Blob for pdf with event details and notes", async () => {
      const result = await generateEventReport({
        metrics: [metric("forty_yard")],
        format: "pdf",
        athleteName: "Jordan",
        event,
      });
      expect(result).toBe("blob");
    });

    it("returns a text template for the text format", async () => {
      const result = await generateEventReport({
        metrics: [],
        format: "text",
        athleteName: "Jordan",
        event,
      });
      expect(result).toBe("event-summary");
    });

    it("throws when no event is supplied", async () => {
      await expect(
        generateEventReport({
          metrics: [],
          format: "pdf",
          athleteName: "Jordan",
        }),
      ).rejects.toThrow("Event required");
    });
  });
});
