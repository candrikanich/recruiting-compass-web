import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  downloadFile,
  generateFilename,
  convertToCSV,
  getMimeType,
} from "~/utils/exportHelpers";
import type { PerformanceMetric } from "~/types/models";

describe("exportHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("downloadFile", () => {
    it("should create and trigger download for string content", () => {
      const createElementSpy = vi.spyOn(document, "createElement");
      const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

      const mockLink = {
        href: "",
        download: "",
        click: vi.fn(),
      };

      createElementSpy.mockReturnValue(mockLink as any);

      downloadFile("test content", "test.txt", "text/plain");

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(mockLink.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();

      createElementSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it("should handle Blob content directly", () => {
      const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");
      const blob = new Blob(["content"], { type: "text/plain" });

      const mockLink = {
        href: "",
        download: "",
        click: vi.fn(),
      };

      vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);

      downloadFile(blob, "test.txt", "text/plain");

      // Should still call createObjectURL to create a URL for the Blob
      expect(createObjectURLSpy).toHaveBeenCalled();

      createObjectURLSpy.mockRestore();
    });

    it("should set correct filename in download", () => {
      const mockLink = {
        href: "",
        download: "",
        click: vi.fn(),
      };

      vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:url");

      downloadFile("content", "myfile.csv", "text/csv");

      expect(mockLink.download).toBe("myfile.csv");
    });

    it("should revoke object URL after download", () => {
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");
      const createObjectURLSpy = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:test-url");

      const mockLink = {
        href: "",
        download: "",
        click: vi.fn(),
      };

      vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);

      downloadFile("content", "test.txt", "text/plain");

      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:test-url");

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe("generateFilename", () => {
    it("should generate filename with date for pdf", () => {
      const filename = generateFilename("summary", "pdf");

      const todayDate = new Date().toISOString().split("T")[0];
      expect(filename).toContain("performance-summary");
      expect(filename).toContain(todayDate);
      expect(filename).toMatch(/\.pdf$/);
    });

    it("should generate filename for csv format", () => {
      const filename = generateFilename("report", "csv");

      expect(filename).toContain("performance-report");
      expect(filename).toMatch(/\.csv$/);
    });

    it("should generate filename for json format", () => {
      const filename = generateFilename("metrics", "json");

      expect(filename).toContain("performance-metrics");
      expect(filename).toMatch(/\.json$/);
    });

    it("should generate filename for unknown format as txt", () => {
      const filename = generateFilename("data", "unknown");

      expect(filename).toContain("performance-data");
      expect(filename).toMatch(/\.txt$/);
    });

    it("should include current date in filename", () => {
      const before = new Date().toISOString().split("T")[0];
      const filename = generateFilename("test", "csv");
      const after = new Date().toISOString().split("T")[0];

      // Date should be between before and after (in case test runs at midnight)
      expect(filename).toContain(before || after);
    });
  });

  describe("convertToCSV", () => {
    it("should convert metrics array to CSV string", () => {
      const metrics: PerformanceMetric[] = [
        {
          id: "1",
          athlete_id: "athlete-1",
          recorded_date: "2024-01-15",
          metric_type: "40_yard_dash",
          value: 4.8,
          unit: "seconds",
          event_id: "event-1",
          verified: true,
          notes: "Good form",
          created_at: "2024-01-15",
        },
        {
          id: "2",
          athlete_id: "athlete-1",
          recorded_date: "2024-01-20",
          metric_type: "vertical_jump",
          value: 32.5,
          unit: "inches",
          event_id: "event-2",
          verified: false,
          notes: "Estimated",
          created_at: "2024-01-20",
        },
      ];

      const csv = convertToCSV(metrics);

      expect(csv).toContain("Date");
      expect(csv).toContain("Metric Type");
      expect(csv).toContain("2024-01-15");
      expect(csv).toContain("40_yard_dash");
      expect(csv).toContain("4.8");
    });

    it("should escape quotes in CSV values", () => {
      const metrics: PerformanceMetric[] = [
        {
          id: "1",
          athlete_id: "athlete-1",
          recorded_date: "2024-01-15",
          metric_type: "test",
          value: 100,
          unit: "units",
          event_id: null,
          verified: true,
          notes: 'Contains "quotes"',
          created_at: "2024-01-15",
        },
      ];

      const csv = convertToCSV(metrics);

      // Quotes should be escaped as ""
      expect(csv).toContain('Contains ""quotes""');
    });

    it("should handle null and undefined values", () => {
      const metrics: PerformanceMetric[] = [
        {
          id: "1",
          athlete_id: "athlete-1",
          recorded_date: "2024-01-15",
          metric_type: "test",
          value: 100,
          unit: undefined as any,
          event_id: null,
          verified: false,
          notes: undefined as any,
          created_at: "2024-01-15",
        },
      ];

      const csv = convertToCSV(metrics);

      // Should not error and should contain the metric value
      expect(csv).toContain("100");
    });

    it("should format verified column correctly", () => {
      const metrics: PerformanceMetric[] = [
        {
          id: "1",
          athlete_id: "athlete-1",
          recorded_date: "2024-01-15",
          metric_type: "test",
          value: 100,
          unit: "units",
          event_id: null,
          verified: true,
          notes: null,
          created_at: "2024-01-15",
        },
        {
          id: "2",
          athlete_id: "athlete-1",
          recorded_date: "2024-01-20",
          metric_type: "test",
          value: 110,
          unit: "units",
          event_id: null,
          verified: false,
          notes: null,
          created_at: "2024-01-20",
        },
      ];

      const csv = convertToCSV(metrics);

      expect(csv).toContain("Yes");
      expect(csv).toContain("No");
    });

    it("should include all required headers", () => {
      const metrics: PerformanceMetric[] = [
        {
          id: "1",
          athlete_id: "athlete-1",
          recorded_date: "2024-01-15",
          metric_type: "test",
          value: 100,
          unit: "units",
          event_id: null,
          verified: true,
          notes: null,
          created_at: "2024-01-15",
        },
      ];

      const csv = convertToCSV(metrics);
      const lines = csv.split("\n");
      const headerLine = lines[0];

      expect(headerLine).toContain("Date");
      expect(headerLine).toContain("Metric Type");
      expect(headerLine).toContain("Value");
      expect(headerLine).toContain("Unit");
      expect(headerLine).toContain("Event ID");
      expect(headerLine).toContain("Verified");
      expect(headerLine).toContain("Notes");
    });

    it("should return empty CSV with just headers for empty array", () => {
      const csv = convertToCSV([]);

      expect(csv).toContain("Date");
      expect(csv).not.toContain("\n");
    });
  });

  describe("getMimeType", () => {
    it("should return pdf MIME type", () => {
      expect(getMimeType("pdf")).toBe("application/pdf");
    });

    it("should return csv MIME type", () => {
      expect(getMimeType("csv")).toBe("text/csv");
    });

    it("should return json MIME type", () => {
      expect(getMimeType("json")).toBe("application/json");
    });

    it("should return text MIME type for text format", () => {
      expect(getMimeType("text")).toBe("text/plain");
    });

    it("should return text/plain as default for unknown format", () => {
      expect(getMimeType("unknown")).toBe("text/plain");
      expect(getMimeType("docx")).toBe("text/plain");
      expect(getMimeType("")).toBe("text/plain");
    });

    it("should be case-sensitive", () => {
      expect(getMimeType("PDF")).toBe("text/plain");
      expect(getMimeType("Csv")).toBe("text/plain");
    });
  });
});
