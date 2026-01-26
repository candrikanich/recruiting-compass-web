import { describe, it, expect } from "vitest";
import {
  getCategoryColor,
  getTaskStatusColor,
  formatCategory,
  formatStatus,
} from "~/utils/taskHelpers";

describe("taskHelpers", () => {
  describe("getTaskStatusColor", () => {
    it("should return gray for not_started", () => {
      const color = getTaskStatusColor("not_started");

      expect(color).toBe("bg-slate-100 text-slate-700");
    });

    it("should return blue for in_progress", () => {
      const color = getTaskStatusColor("in_progress");

      expect(color).toBe("bg-blue-100 text-blue-700");
    });

    it("should return green for completed", () => {
      const color = getTaskStatusColor("completed");

      expect(color).toBe("bg-emerald-100 text-emerald-700");
    });

    it("should return dark gray for skipped", () => {
      const color = getTaskStatusColor("skipped");

      expect(color).toBe("bg-slate-100 text-slate-600");
    });

    it("should return default color for unknown status", () => {
      const color = getTaskStatusColor("unknown_status" as any);

      expect(color).toBe("bg-slate-100 text-slate-700");
    });

    it("should include TailwindCSS background and text classes", () => {
      const color = getTaskStatusColor("completed");

      expect(color).toContain("bg-");
      expect(color).toContain("text-");
    });
  });

  describe("getCategoryColor", () => {
    it("should return blue for academic", () => {
      const color = getCategoryColor("academic");

      expect(color).toBe("bg-blue-100 text-blue-700");
    });

    it("should return purple for athletic", () => {
      const color = getCategoryColor("athletic");

      expect(color).toBe("bg-purple-100 text-purple-700");
    });

    it("should return green for recruiting", () => {
      const color = getCategoryColor("recruiting");

      expect(color).toBe("bg-emerald-100 text-emerald-700");
    });

    it("should return orange for exposure", () => {
      const color = getCategoryColor("exposure");

      expect(color).toBe("bg-orange-100 text-orange-700");
    });

    it("should return pink for mindset", () => {
      const color = getCategoryColor("mindset");

      expect(color).toBe("bg-pink-100 text-pink-700");
    });

    it("should return default color for unknown category", () => {
      const color = getCategoryColor("unknown_category" as any);

      expect(color).toBe("bg-slate-100 text-slate-700");
    });

    it("should include TailwindCSS background and text classes", () => {
      const color = getCategoryColor("academic");

      expect(color).toContain("bg-");
      expect(color).toContain("text-");
    });

    it("should have unique colors for each category", () => {
      const colors = [
        getCategoryColor("academic"),
        getCategoryColor("athletic"),
        getCategoryColor("recruiting"),
        getCategoryColor("exposure"),
        getCategoryColor("mindset"),
      ];

      const uniqueColors = new Set(colors);

      expect(uniqueColors.size).toBe(5);
    });
  });

  describe("formatStatus", () => {
    it("should format not_started as Not Started", () => {
      const result = formatStatus("not_started");

      expect(result).toBe("Not Started");
    });

    it("should format in_progress as In Progress", () => {
      const result = formatStatus("in_progress");

      expect(result).toBe("In Progress");
    });

    it("should format completed as Completed", () => {
      const result = formatStatus("completed");

      expect(result).toBe("Completed");
    });

    it("should format skipped as Skipped", () => {
      const result = formatStatus("skipped");

      expect(result).toBe("Skipped");
    });

    it("should return status as-is for unknown status", () => {
      const result = formatStatus("unknown_status" as any);

      expect(result).toBe("unknown_status");
    });

    it("should have proper capitalization", () => {
      const statuses = [
        formatStatus("not_started"),
        formatStatus("in_progress"),
        formatStatus("completed"),
        formatStatus("skipped"),
      ];

      statuses.forEach((status) => {
        expect(status).toMatch(/^[A-Z]/);
      });
    });
  });

  describe("formatCategory", () => {
    it("should format academic as Academic", () => {
      const result = formatCategory("academic");

      expect(result).toBe("Academic");
    });

    it("should format athletic as Athletic", () => {
      const result = formatCategory("athletic");

      expect(result).toBe("Athletic");
    });

    it("should format recruiting as Recruiting", () => {
      const result = formatCategory("recruiting");

      expect(result).toBe("Recruiting");
    });

    it("should format exposure as Exposure", () => {
      const result = formatCategory("exposure");

      expect(result).toBe("Exposure");
    });

    it("should format mindset as Mindset", () => {
      const result = formatCategory("mindset");

      expect(result).toBe("Mindset");
    });

    it("should return category as-is for unknown category", () => {
      const result = formatCategory("unknown_category" as any);

      expect(result).toBe("unknown_category");
    });

    it("should have proper capitalization", () => {
      const categories = [
        formatCategory("academic"),
        formatCategory("athletic"),
        formatCategory("recruiting"),
        formatCategory("exposure"),
        formatCategory("mindset"),
      ];

      categories.forEach((category) => {
        expect(category).toMatch(/^[A-Z]/);
      });
    });
  });
});
