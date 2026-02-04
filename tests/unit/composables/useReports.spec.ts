import { describe, it, expect, beforeEach, vi } from "vitest";
import { useReports } from "~/composables/useReports";
import type { ReportData } from "~/utils/reportExport";

// Mock dependent composables
vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: { value: [] },
  }),
}));

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({
    coaches: { value: [] },
  }),
}));

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({
    interactions: { value: [] },
  }),
}));

vi.mock("~/composables/usePerformance", () => ({
  usePerformance: () => ({
    metrics: { value: [] },
  }),
}));

// Mock report utility functions
vi.mock("~/utils/reportExport", () => ({
  generateReportData: vi.fn(),
  exportReportToCSV: vi.fn(),
  downloadReport: vi.fn(),
}));

import {
  generateReportData,
  exportReportToCSV,
  downloadReport,
} from "~/utils/reportExport";

describe("useReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with null report", () => {
      const { currentReport } = useReports();
      expect(currentReport.value).toBeNull();
    });

    it("should initialize with isGenerating false", () => {
      const { isGenerating } = useReports();
      expect(isGenerating.value).toBe(false);
    });

    it("should initialize with no error", () => {
      const { error } = useReports();
      expect(error.value).toBeNull();
    });
  });

  describe("generateReport", () => {
    it("should generate report with date range", async () => {
      const reportData: ReportData = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: {
          total_coaches: 5,
          total_schools: 10,
          total_interactions: 20,
        },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      vi.mocked(generateReportData).mockReturnValue(reportData);

      const { generateReport, currentReport } = useReports();
      await generateReport("2024-01-01", "2024-01-15");

      expect(generateReportData).toHaveBeenCalledWith(
        [],
        [],
        [],
        [],
        "2024-01-01",
        "2024-01-15",
      );
      expect(currentReport.value).toEqual(reportData);
    });

    it("should set isGenerating to false after generation completes", async () => {
      const reportData: ReportData = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: {
          total_coaches: 0,
          total_schools: 0,
          total_interactions: 0,
        },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      vi.mocked(generateReportData).mockResolvedValue(reportData);

      const { generateReport, isGenerating } = useReports();
      const promise = generateReport("2024-01-01", "2024-01-15");

      // After the promise completes
      await promise;
      expect(isGenerating.value).toBe(false);
    });

    it("should clear previous error on new generation", async () => {
      const reportData: ReportData = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: { total_coaches: 0, total_schools: 0, total_interactions: 0 },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      vi.mocked(generateReportData).mockReturnValue(reportData);

      const { generateReport, error } = useReports();
      error.value = "Previous error";

      await generateReport("2024-01-01", "2024-01-15");

      expect(error.value).toBeNull();
    });

    it("should handle generation error", async () => {
      const testError = new Error("Generation failed");
      vi.mocked(generateReportData).mockImplementation(() => {
        throw testError;
      });

      const consoleSpy = vi.spyOn(console, "error");
      const { generateReport, error, currentReport } = useReports();

      await generateReport("2024-01-01", "2024-01-15");

      expect(error.value).toContain("Generation failed");
      expect(currentReport.value).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle non-Error exception during generation", async () => {
      vi.mocked(generateReportData).mockImplementation(() => {
        throw "Unknown error";
      });

      const { generateReport, error } = useReports();
      await generateReport("2024-01-01", "2024-01-15");

      expect(error.value).toContain("Failed to generate report");
    });

    it("should set isGenerating to false even on error", async () => {
      vi.mocked(generateReportData).mockImplementation(() => {
        throw new Error("Error");
      });

      const { generateReport, isGenerating } = useReports();
      await generateReport("2024-01-01", "2024-01-15");

      expect(isGenerating.value).toBe(false);
    });
  });

  describe("exportToCSV", () => {
    it("should export current report to CSV", async () => {
      const reportData: ReportData = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: {
          total_coaches: 5,
          total_schools: 10,
          total_interactions: 20,
        },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      vi.mocked(generateReportData).mockReturnValue(reportData);
      vi.mocked(exportReportToCSV).mockReturnValue("csv,data,here");

      const { generateReport, exportToCSV } = useReports();
      await generateReport("2024-01-01", "2024-01-15");
      exportToCSV("test-report.csv");

      expect(exportReportToCSV).toHaveBeenCalledWith(reportData);
      expect(downloadReport).toHaveBeenCalledWith(
        "test-report.csv",
        "csv,data,here",
      );
    });

    it("should use default filename if not provided", async () => {
      const reportData: ReportData = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: { total_coaches: 0, total_schools: 0, total_interactions: 0 },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      vi.mocked(generateReportData).mockReturnValue(reportData);
      vi.mocked(exportReportToCSV).mockReturnValue("csv");

      const { generateReport, exportToCSV } = useReports();
      await generateReport("2024-01-01", "2024-01-15");
      exportToCSV();

      expect(downloadReport).toHaveBeenCalledWith(
        "recruiting-report.csv",
        "csv",
      );
    });

    it("should set error when no report exists", () => {
      const { exportToCSV, error } = useReports();
      exportToCSV("test.csv");

      expect(error.value).toBe("No report to export");
      expect(downloadReport).not.toHaveBeenCalled();
    });

    it("should handle export error", async () => {
      const reportData: ReportData = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: { total_coaches: 0, total_schools: 0, total_interactions: 0 },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      vi.mocked(generateReportData).mockReturnValue(reportData);
      const exportError = new Error("Export failed");
      vi.mocked(exportReportToCSV).mockImplementation(() => {
        throw exportError;
      });

      const consoleSpy = vi.spyOn(console, "error");
      const { generateReport, exportToCSV, error } = useReports();

      await generateReport("2024-01-01", "2024-01-15");
      exportToCSV("test.csv");

      expect(error.value).toContain("Export failed");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle non-Error exception during export", async () => {
      const reportData: ReportData = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: { total_coaches: 0, total_schools: 0, total_interactions: 0 },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      vi.mocked(generateReportData).mockReturnValue(reportData);
      vi.mocked(exportReportToCSV).mockImplementation(() => {
        throw "Unknown error";
      });

      const { generateReport, exportToCSV, error } = useReports();
      await generateReport("2024-01-01", "2024-01-15");
      exportToCSV("test.csv");

      expect(error.value).toContain("Failed to export report");
    });
  });

  describe("clearReport", () => {
    it("should clear current report", async () => {
      const reportData: ReportData = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: { total_coaches: 0, total_schools: 0, total_interactions: 0 },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      vi.mocked(generateReportData).mockReturnValue(reportData);

      const { generateReport, clearReport, currentReport } = useReports();
      await generateReport("2024-01-01", "2024-01-15");

      expect(currentReport.value).not.toBeNull();
      clearReport();
      expect(currentReport.value).toBeNull();
    });

    it("should clear error", () => {
      const { clearReport, error } = useReports();
      error.value = "Some error";

      clearReport();

      expect(error.value).toBeNull();
    });

    it("should clear both report and error together", () => {
      const { clearReport, currentReport, error } = useReports();
      currentReport.value = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: { total_coaches: 0, total_schools: 0, total_interactions: 0 },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };
      error.value = "Error";

      clearReport();

      expect(currentReport.value).toBeNull();
      expect(error.value).toBeNull();
    });
  });

  describe("workflow integration", () => {
    it("should support full report generation and export workflow", async () => {
      const reportData: ReportData = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: {
          total_coaches: 5,
          total_schools: 10,
          total_interactions: 20,
        },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      vi.mocked(generateReportData).mockReturnValue(reportData);
      vi.mocked(exportReportToCSV).mockReturnValue("csv,data");

      const { generateReport, exportToCSV, clearReport, currentReport, error } =
        useReports();

      // Generate report
      await generateReport("2024-01-01", "2024-01-15");
      expect(currentReport.value).toEqual(reportData);
      expect(error.value).toBeNull();

      // Export to CSV
      exportToCSV("my-report.csv");
      expect(downloadReport).toHaveBeenCalledWith("my-report.csv", "csv,data");

      // Clear report
      clearReport();
      expect(currentReport.value).toBeNull();
    });

    it("should handle multiple report generations", async () => {
      const report1: ReportData = {
        generated_at: "2024-01-15",
        period: { from: "2024-01-01", to: "2024-01-15" },
        summary: {
          total_coaches: 5,
          total_schools: 10,
          total_interactions: 20,
        },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      const report2: ReportData = {
        generated_at: "2024-02-15",
        period: { from: "2024-02-01", to: "2024-02-15" },
        summary: {
          total_coaches: 6,
          total_schools: 12,
          total_interactions: 25,
        },
        coaches: [],
        schools: [],
        interactions: [],
        metrics: [],
      };

      vi.mocked(generateReportData)
        .mockReturnValueOnce(report1)
        .mockReturnValueOnce(report2);

      const { generateReport, currentReport } = useReports();

      await generateReport("2024-01-01", "2024-01-15");
      expect(currentReport.value).toEqual(report1);

      await generateReport("2024-02-01", "2024-02-15");
      expect(currentReport.value).toEqual(report2);
    });
  });
});
