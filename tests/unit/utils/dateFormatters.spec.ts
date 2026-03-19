import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDate,
  daysAgo,
  formatDateWithRelative,
  formatDateTime,
} from "~/utils/dateFormatters";

describe("dateFormatters", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatDate", () => {
    it("returns empty string for undefined", () => {
      expect(formatDate(undefined)).toBe("");
    });

    it("returns empty string for empty string", () => {
      expect(formatDate("")).toBe("");
    });

    it("returns a string containing the year for a valid date", () => {
      expect(formatDate("2026-01-15T00:00:00.000Z")).toEqual(
        expect.stringContaining("2026"),
      );
    });

    it("returns a string containing the month abbreviation", () => {
      expect(formatDate("2026-01-15T00:00:00.000Z")).toEqual(
        expect.stringContaining("Jan"),
      );
    });
  });

  describe("daysAgo", () => {
    it("returns 10 for a date 10 days ago", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));
      expect(daysAgo("2026-03-09T12:00:00.000Z")).toBe(10);
    });

    it("returns 0 for today's date", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));
      expect(daysAgo("2026-03-19T12:00:00.000Z")).toBe(0);
    });

    it("returns 1 for yesterday", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));
      expect(daysAgo("2026-03-18T12:00:00.000Z")).toBe(1);
    });
  });

  describe("formatDateWithRelative", () => {
    it("returns string containing '1 day ago' for one day ago", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));
      expect(formatDateWithRelative("2026-03-18T12:00:00.000Z")).toEqual(
        expect.stringContaining("1 day ago"),
      );
    });

    it("returns string containing '3 days ago' for three days ago", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));
      expect(formatDateWithRelative("2026-03-16T12:00:00.000Z")).toEqual(
        expect.stringContaining("3 days ago"),
      );
    });

    it("uses singular 'day' for exactly 1 day", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));
      const result = formatDateWithRelative("2026-03-18T12:00:00.000Z");
      expect(result).toContain("(1 day ago)");
    });

    it("uses plural 'days' for more than 1 day", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));
      const result = formatDateWithRelative("2026-03-16T12:00:00.000Z");
      expect(result).toContain("(3 days ago)");
    });
  });

  describe("formatDateTime", () => {
    it("returns 'Unknown' for undefined", () => {
      expect(formatDateTime(undefined)).toBe("Unknown");
    });

    it("returns a string containing the month abbreviation for a valid date", () => {
      expect(formatDateTime("2026-03-01T10:00:00.000Z")).toEqual(
        expect.stringContaining("Mar"),
      );
    });

    it("returns a string containing the year for a valid date", () => {
      expect(formatDateTime("2026-03-01T10:00:00.000Z")).toEqual(
        expect.stringContaining("2026"),
      );
    });
  });
});
