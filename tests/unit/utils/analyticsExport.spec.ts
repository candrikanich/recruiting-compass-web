import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chartToImage,
  elementToImage,
  exportAnalyticsPDF,
  generateAnalyticsReport,
} from "~/utils/exportUtils";

vi.mock("html2canvas", () => ({
  default: vi.fn(async (element) => {
    return {
      toDataURL: () => "data:image/png;base64,mockImageData",
    };
  }),
}));

export const mockJsPDFInstances: any[] = [];

vi.mock("jspdf", () => {
  class MockJsPDF {
    text = vi.fn();
    addImage = vi.fn();
    addPage = vi.fn();
    save = vi.fn();
    setFontSize = vi.fn();
    setTextColor = vi.fn();
    internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
    };
    lastAutoTable: { finalY: number } | undefined;
    autoTable = vi.fn(() => {
      this.lastAutoTable = { finalY: 150 };
    });

    constructor() {
      mockJsPDFInstances.push(this);
    }
  }

  return {
    jsPDF: MockJsPDF,
  };
});

// Mock autoTable plugin
vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

describe("Analytics Export Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("chartToImage", () => {
    it("converts canvas to PNG data URL", async () => {
      const mockCanvas = document.createElement("canvas");
      // Mock toDataURL method
      mockCanvas.toDataURL = vi.fn(() => "data:image/png;base64,mockImageData");
      const result = await chartToImage(mockCanvas);

      expect(result).toContain("data:image/png");
    });

    it("returns proper data:image/png format", async () => {
      const mockCanvas = document.createElement("canvas");
      // Mock toDataURL method
      mockCanvas.toDataURL = vi.fn(() => "data:image/png;base64,mockImageData");
      const result = await chartToImage(mockCanvas);

      expect(result.startsWith("data:image/png")).toBe(true);
    });

    it("handles null canvas gracefully", async () => {
      await expect(chartToImage(null as any)).rejects.toThrow(
        "Chart element is null or undefined",
      );
    });
  });

  describe("elementToImage", () => {
    it("calls html2canvas with correct options", async () => {
      const element = document.createElement("div");
      await elementToImage(element);

      const mockHtml2Canvas = vi.mocked((await import("html2canvas")).default);
      expect(mockHtml2Canvas).toHaveBeenCalledWith(
        element,
        expect.objectContaining({ useCORS: true, backgroundColor: "#ffffff" }),
      );
    });

    it("returns PNG data URL", async () => {
      const element = document.createElement("div");
      const result = await elementToImage(element);

      expect(result).toContain("data:image/png");
    });

    it("handles missing element gracefully", async () => {
      const result = await elementToImage(null as any);
      expect(result).toBeDefined();
    });
  });

  describe("exportAnalyticsPDF", () => {
    const chartElements = () => [
      { title: "Chart A", element: document.createElement("div") },
    ];

    it("creates a jsPDF instance and titles the report", async () => {
      await exportAnalyticsPDF(
        chartElements(),
        { start: "2025-01-01", end: "2025-12-31" },
        [{ label: "total", value: 100 }],
      );

      const instance = mockJsPDFInstances[mockJsPDFInstances.length - 1];
      expect(instance.text).toHaveBeenCalledWith(
        "Analytics Report",
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("adds title and date range text", async () => {
      await exportAnalyticsPDF(
        chartElements(),
        { start: "2025-01-01", end: "2025-12-31" },
        [{ label: "total", value: 100 }],
      );

      const instance = mockJsPDFInstances[mockJsPDFInstances.length - 1];
      expect(instance.text).toHaveBeenCalledWith(
        expect.stringContaining("2025-01-01"),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("adds a summary stats table via autoTable", async () => {
      await exportAnalyticsPDF(
        chartElements(),
        { start: "2025-01-01", end: "2025-12-31" },
        [
          { label: "metric1", value: 100 },
          { label: "metric2", value: 200 },
        ],
      );

      const instance = mockJsPDFInstances[mockJsPDFInstances.length - 1];
      expect(instance.autoTable).toHaveBeenCalled();
    });

    it("skips the summary table when there are no stats", async () => {
      await exportAnalyticsPDF(
        chartElements(),
        { start: "2025-01-01", end: "2025-12-31" },
        [],
      );

      const instance = mockJsPDFInstances[mockJsPDFInstances.length - 1];
      expect(instance.autoTable).not.toHaveBeenCalled();
    });

    it("adds a new page when charts overflow the current page", async () => {
      const manyCharts = Array(5)
        .fill(null)
        .map((_, i) => ({
          title: `Chart ${i}`,
          element: document.createElement("div"),
        }));

      await exportAnalyticsPDF(
        manyCharts,
        { start: "2025-01-01", end: "2025-12-31" },
        [],
      );

      const instance = mockJsPDFInstances[mockJsPDFInstances.length - 1];
      expect(instance.addPage).toHaveBeenCalled();
    });

    it("calls pdf.save with the provided filename", async () => {
      await exportAnalyticsPDF(
        chartElements(),
        { start: "2025-01-01", end: "2025-12-31" },
        [],
        "custom-report.pdf",
      );

      const instance = mockJsPDFInstances[mockJsPDFInstances.length - 1];
      expect(instance.save).toHaveBeenCalledWith("custom-report.pdf");
    });

    it("does not throw when summaryStats is an empty array and charts is empty", async () => {
      await expect(
        exportAnalyticsPDF([], { start: "2025-01-01", end: "2025-12-31" }, []),
      ).resolves.toBeUndefined();
    });
  });

  describe("generateAnalyticsReport", () => {
    it("generates printable HTML", async () => {
      const title = "Test Report";
      const summaryHTML = "<div>Data</div>";
      const dateRange = { start: "2025-01-01", end: "2025-01-31" };

      const result = await generateAnalyticsReport(
        title,
        [],
        summaryHTML,
        dateRange,
      );

      expect(result).toContain("Test Report");
      expect(result).toContain("Data");
    });

    it("includes date range in report", async () => {
      const title = "Test Report";
      const summaryHTML = "<div>Data</div>";
      const dateRange = { start: "2025-01-01", end: "2025-01-31" };

      const result = await generateAnalyticsReport(
        title,
        [],
        summaryHTML,
        dateRange,
      );

      expect(result).toContain("2025");
    });

    it("formats as HTML", async () => {
      const title = "Test Report";
      const summaryHTML = "<div>Data</div>";
      const dateRange = { start: "2025-01-01", end: "2025-01-31" };

      const result = await generateAnalyticsReport(
        title,
        [],
        summaryHTML,
        dateRange,
      );

      // Debug: Check the actual HTML structure
      console.log("HTML length:", result.length);
      console.log("HTML starts with:", result.substring(0, 50));

      expect(
        result.trim().replace(/\s+/g, " ").startsWith("<!DOCTYPE html>"),
      ).toBe(true);
    });

    it("includes title in report", async () => {
      const title = "My Analytics Report";
      const summaryHTML = "<div>Important Data</div>";
      const dateRange = { start: "2025-01-01", end: "2025-01-31" };

      const result = await generateAnalyticsReport(
        title,
        [],
        summaryHTML,
        dateRange,
      );

      expect(result).toContain("My Analytics Report");
    });

    it("includes summary HTML", async () => {
      const title = "Report";
      const summaryHTML = "<div>Important Data</div>";
      const dateRange = { start: "2025-01-01", end: "2025-01-31" };

      const result = await generateAnalyticsReport(
        "Report",
        [],
        summaryHTML,
        dateRange,
      );

      expect(result).toContain("Important Data");
    });
  });
});
