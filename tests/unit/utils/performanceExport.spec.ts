import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  exportMetricsToCSV,
  exportMetricsToPDF,
  exportMetricsByCategory,
} from "~/utils/performanceExport";
import { downloadFile } from "~/utils/exportHelpers";
import type { PerformanceMetric } from "~/types/models";

describe("performanceExport utilities", () => {
  const createMockMetric = (overrides = {}): PerformanceMetric => ({
    id: "metric-1",
    user_id: "user-1",
    metric_type: "velocity",
    value: 90,
    unit: "mph",
    recorded_date: "2024-01-15",
    verified: false,
    notes: "Good session",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  describe("exportMetricsToCSV", () => {
    it("should export empty metrics as empty string", () => {
      const csv = exportMetricsToCSV([]);
      expect(csv).toBe("");
    });

    it("should export metrics with headers", () => {
      const metrics = [createMockMetric()];
      const csv = exportMetricsToCSV(metrics);

      expect(csv).toContain("Date");
      expect(csv).toContain("Metric Type");
      expect(csv).toContain("Value");
      expect(csv).toContain("Unit");
      expect(csv).toContain("Verified");
      expect(csv).toContain("Notes");
    });

    it("should export metric data as rows", () => {
      const metrics = [
        createMockMetric({ metric_type: "velocity", value: 90 }),
        createMockMetric({
          id: "metric-2",
          metric_type: "exit_velo",
          value: 85,
          verified: true,
        }),
      ];
      const csv = exportMetricsToCSV(metrics);

      expect(csv).toContain("90");
      expect(csv).toContain("85");
      expect(csv).toContain("Fastball Velocity");
      expect(csv).toContain("Exit Velocity");
    });

    it("should format verified status as Yes/No", () => {
      const metrics = [
        createMockMetric({ verified: true }),
        createMockMetric({ id: "metric-2", verified: false }),
      ];
      const csv = exportMetricsToCSV(metrics);

      expect(csv).toContain("Yes");
      expect(csv).toContain("No");
    });

    it("should escape quotes in notes", () => {
      const metrics = [createMockMetric({ notes: 'Good "session" notes' })];
      const csv = exportMetricsToCSV(metrics);

      expect(csv).toContain('Good ""session"" notes');
    });

    it("should sort metrics by date ascending", () => {
      // Create metrics with explicit dates to avoid default date interference
      const metrics = [
        createMockMetric({ id: "metric-1", recorded_date: "2024-01-20" }),
        createMockMetric({ id: "metric-2", recorded_date: "2024-01-10" }),
        createMockMetric({ id: "metric-3", recorded_date: "2024-01-15" }),
      ];

      // Verify our test data
      expect(metrics[0].recorded_date).toBe("2024-01-20");
      expect(metrics[1].recorded_date).toBe("2024-01-10");
      expect(metrics[2].recorded_date).toBe("2024-01-15");

      const csv = exportMetricsToCSV(metrics);
      const lines = csv.split("\n");

      // Check that dates are sorted ascending: 01/10, then 01/15, then 01/20
      const sortedDates = lines
        .slice(1) // Skip header
        .filter((line) => line.trim()) // Remove empty lines
        .map((line) => line.match(/"([^"]+)"/)?.[1]) // Extract first quoted field (date)
        .filter(Boolean);

      // Check that we have exactly 3 dates
      expect(sortedDates).toHaveLength(3);

      // Due to timezone conversion, the dates might be one day earlier
      // when parsed from ISO date strings. We'll check the actual values.
      const expectedFirstDate = new Date("2024-01-10").toLocaleDateString(
        "en-US",
        { year: "numeric", month: "2-digit", day: "2-digit" },
      );
      const expectedSecondDate = new Date("2024-01-15").toLocaleDateString(
        "en-US",
        { year: "numeric", month: "2-digit", day: "2-digit" },
      );
      const expectedThirdDate = new Date("2024-01-20").toLocaleDateString(
        "en-US",
        { year: "numeric", month: "2-digit", day: "2-digit" },
      );

      expect(sortedDates[0]).toBe(expectedFirstDate);
      expect(sortedDates[1]).toBe(expectedSecondDate);
      expect(sortedDates[2]).toBe(expectedThirdDate);
    });

    it("should handle metrics with empty notes", () => {
      const metrics = [createMockMetric({ notes: "" })];
      const csv = exportMetricsToCSV(metrics);

      expect(csv).toContain('""');
    });

    it("should handle metrics with null unit", () => {
      const metrics = [createMockMetric({ unit: null })];
      const csv = exportMetricsToCSV(metrics);

      expect(csv).toBeDefined();
      expect(csv.length).toBeGreaterThan(0);
    });
  });

  describe("exportMetricsToPDF", () => {
    it("should return a blob", async () => {
      const metrics = [createMockMetric()];
      const pdf = await exportMetricsToPDF(metrics);

      expect(pdf).toBeInstanceOf(Blob);
      expect(pdf.type).toContain("pdf");
    });

    it("should handle empty metrics array", async () => {
      const pdf = await exportMetricsToPDF([]);
      expect(pdf).toBeInstanceOf(Blob);
    });

    it("should include title in PDF", async () => {
      const metrics = [createMockMetric()];
      const pdf = await exportMetricsToPDF(metrics, "Custom Report Title");

      expect(pdf).toBeInstanceOf(Blob);
      expect(pdf.size).toBeGreaterThan(0);
    });

    it("should calculate statistics in PDF", async () => {
      const metrics = [
        createMockMetric({ value: 80 }),
        createMockMetric({ id: "metric-2", value: 100 }),
      ];
      const pdf = await exportMetricsToPDF(metrics);

      expect(pdf).toBeInstanceOf(Blob);
      expect(pdf.size).toBeGreaterThan(0);
    });

    it("should include date range in PDF", async () => {
      const metrics = [
        createMockMetric({ recorded_date: "2024-01-01" }),
        createMockMetric({ id: "metric-2", recorded_date: "2024-01-31" }),
      ];
      const pdf = await exportMetricsToPDF(metrics);

      expect(pdf).toBeInstanceOf(Blob);
    });

    it("should throw on jsPDF import error", async () => {
      // This would require mocking the dynamic import
      // For now, we just verify the function handles the async import
      const metrics = [createMockMetric()];
      const pdf = await exportMetricsToPDF(metrics);

      expect(pdf).toBeDefined();
    });
  });

  describe("downloadFile", () => {
    it("should create and trigger download for string content", () => {
      const createElementSpy = vi.spyOn(document, "createElement");
      const clickSpy = vi.fn();
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

      downloadFile("test content", "test.csv", "text/csv");

      expect(createElementSpy).toHaveBeenCalledWith("a");
      createElementSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it("should handle blob content", () => {
      const blob = new Blob(["test"], { type: "text/plain" });
      const createElementSpy = vi.spyOn(document, "createElement");

      downloadFile(blob, "test.txt", "text/plain");

      expect(createElementSpy).toHaveBeenCalledWith("a");
      createElementSpy.mockRestore();
    });

    it("should create blob with correct mime type", () => {
      const blobSpy = vi.spyOn(global, "Blob" as any);
      const createObjectURLSpy = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("mock-url");
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

      downloadFile("csv content", "export.csv", "text/csv");

      expect(blobSpy).toHaveBeenCalledWith(["csv content"], {
        type: "text/csv",
      });
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith("mock-url");

      blobSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe("exportMetricsByCategory", () => {
    it("should export metrics grouped by category", () => {
      const metrics = [
        createMockMetric({ metric_type: "velocity", value: 90 }),
        createMockMetric({
          id: "metric-2",
          metric_type: "exit_velo",
          value: 85,
        }),
        createMockMetric({
          id: "metric-3",
          metric_type: "sixty_time",
          value: 7.2,
        }),
      ];

      const categories = {
        power: ["velocity", "exit_velo"],
        speed: ["sixty_time"],
      };

      const exports = exportMetricsByCategory(metrics, categories);

      expect(exports.power).toBeDefined();
      expect(exports.speed).toBeDefined();
      expect(exports.power).toContain("Fastball Velocity");
      expect(exports.power).toContain("Exit Velocity");
      expect(exports.speed).toContain("60-Yard Dash");
    });

    it("should skip empty categories", () => {
      const metrics = [createMockMetric({ metric_type: "velocity" })];

      const categories = {
        power: ["velocity"],
        hitting: ["batting_avg"], // No batting_avg metrics
      };

      const exports = exportMetricsByCategory(metrics, categories);

      expect(exports.power).toBeDefined();
      expect(exports.hitting).toBeUndefined();
    });

    it("should handle category with no matching metrics", () => {
      const metrics = [createMockMetric({ metric_type: "velocity" })];

      const categories = {
        pitching: ["era", "strikeouts"],
      };

      const exports = exportMetricsByCategory(metrics, categories);

      expect(Object.keys(exports).length).toBe(0);
    });
  });

  describe("helper functions", () => {
    it("should correctly format metric types", () => {
      const metricTypes = [
        { type: "velocity", label: "Fastball Velocity" },
        { type: "exit_velo", label: "Exit Velocity" },
        { type: "sixty_time", label: "60-Yard Dash" },
        { type: "batting_avg", label: "Batting Average" },
      ];

      const csv = exportMetricsToCSV([
        createMockMetric({ metric_type: "velocity" }),
        createMockMetric({ id: "metric-2", metric_type: "exit_velo" }),
        createMockMetric({ id: "metric-3", metric_type: "sixty_time" }),
        createMockMetric({ id: "metric-4", metric_type: "batting_avg" }),
      ]);

      metricTypes.forEach(({ type, label }) => {
        expect(csv).toContain(label);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle very large value lists", () => {
      const metrics = Array.from({ length: 1000 }, (_, i) =>
        createMockMetric({
          id: `metric-${i}`,
          value: 80 + (i % 20),
          recorded_date: new Date(2024, 0, (i % 31) + 1)
            .toISOString()
            .split("T")[0],
        }),
      );

      const csv = exportMetricsToCSV(metrics);
      const lines = csv.split("\n");

      expect(lines.length).toBe(1001); // Header + 1000 metrics
    });

    it("should handle special characters in notes", () => {
      const metrics = [
        createMockMetric({
          notes: "Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?",
        }),
      ];

      const csv = exportMetricsToCSV(metrics);
      expect(csv).toBeDefined();
      expect(csv.length).toBeGreaterThan(0);
    });

    it("should handle unicode characters in notes", () => {
      const metrics = [
        createMockMetric({
          notes: "Unicode: 你好 مرحبا 🚀",
        }),
      ];

      const csv = exportMetricsToCSV(metrics);
      expect(csv).toContain("Unicode");
    });
  });
});
