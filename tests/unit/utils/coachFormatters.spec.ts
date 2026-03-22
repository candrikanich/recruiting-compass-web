import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getDaysAgoExact,
  getRoleBadgeClass,
  formatCoachDate,
  formatDateWithTime,
} from "~/utils/coachFormatters";

describe("coachFormatters", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getDaysAgoExact", () => {
    it("returns 'today' when the date is today", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));
      expect(getDaysAgoExact("2026-03-19")).toBe("today");
    });

    it("returns '1 day ago' for yesterday", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));
      expect(getDaysAgoExact("2026-03-18")).toBe("1 day ago");
    });

    it("returns '5 days ago' for five days ago", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));
      expect(getDaysAgoExact("2026-03-14")).toBe("5 days ago");
    });
  });

  describe("getRoleBadgeClass", () => {
    it("returns purple class for 'head' role", () => {
      expect(getRoleBadgeClass("head")).toContain("purple");
    });

    it("returns blue class for 'assistant' role", () => {
      expect(getRoleBadgeClass("assistant")).toContain("blue");
    });

    it("returns emerald class for 'recruiting' role", () => {
      expect(getRoleBadgeClass("recruiting")).toContain("emerald");
    });

    it("returns slate class for unknown role", () => {
      expect(getRoleBadgeClass("unknown")).toContain("slate");
    });

    it("returns slate class for empty string", () => {
      expect(getRoleBadgeClass("")).toContain("slate");
    });
  });

  describe("formatCoachDate", () => {
    it("returns a string containing the year", () => {
      expect(formatCoachDate("2026-01-15T12:00:00.000Z")).toEqual(
        expect.stringContaining("2026"),
      );
    });

    it("returns a string containing the month name", () => {
      expect(formatCoachDate("2026-01-15T12:00:00.000Z")).toEqual(
        expect.stringContaining("January"),
      );
    });
  });

  describe("formatDateWithTime", () => {
    it("returns a string containing the year", () => {
      expect(formatDateWithTime("2026-01-15T14:30:00.000Z")).toEqual(
        expect.stringContaining("2026"),
      );
    });

    it("returns a string containing the month abbreviation", () => {
      expect(formatDateWithTime("2026-01-15T14:30:00.000Z")).toEqual(
        expect.stringContaining("Jan"),
      );
    });
  });
});
