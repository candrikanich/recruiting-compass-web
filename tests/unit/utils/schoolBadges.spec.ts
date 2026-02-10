import { describe, it, expect } from "vitest";
import {
  getStatusBadgeClass,
  getSizeBadgeClass,
  getFitScoreBadgeClass,
  formatSchoolStatus,
} from "~/utils/schoolBadges";

describe("schoolBadges", () => {
  describe("getStatusBadgeClass", () => {
    it("returns correct class for each known status", () => {
      expect(getStatusBadgeClass("researching")).toBe(
        "bg-slate-100 text-slate-700",
      );
      expect(getStatusBadgeClass("contacted")).toBe(
        "bg-yellow-100 text-yellow-700",
      );
      expect(getStatusBadgeClass("interested")).toBe(
        "bg-emerald-100 text-emerald-700",
      );
      expect(getStatusBadgeClass("offer_received")).toBe(
        "bg-green-100 text-green-700",
      );
      expect(getStatusBadgeClass("committed")).toBe(
        "bg-purple-100 text-purple-700",
      );
      expect(getStatusBadgeClass("declined")).toBe("bg-red-100 text-red-700");
    });

    it("returns default class for unknown status", () => {
      expect(getStatusBadgeClass("unknown")).toBe(
        "bg-slate-100 text-slate-700",
      );
    });
  });

  describe("getSizeBadgeClass", () => {
    it("returns empty string for null/undefined", () => {
      expect(getSizeBadgeClass(null)).toBe("");
      expect(getSizeBadgeClass(undefined)).toBe("");
    });

    it("returns correct class for each size", () => {
      expect(getSizeBadgeClass("Very Small")).toBe(
        "bg-indigo-100 text-indigo-700",
      );
      expect(getSizeBadgeClass("Small")).toBe("bg-blue-100 text-blue-700");
      expect(getSizeBadgeClass("Medium")).toBe(
        "bg-emerald-100 text-emerald-700",
      );
      expect(getSizeBadgeClass("Large")).toBe("bg-orange-100 text-orange-700");
      expect(getSizeBadgeClass("Very Large")).toBe(
        "bg-purple-100 text-purple-700",
      );
    });

    it("returns default for unknown size", () => {
      expect(getSizeBadgeClass("Tiny")).toBe("bg-slate-100 text-slate-700");
    });
  });

  describe("getFitScoreBadgeClass", () => {
    it("returns emerald for scores >= 70", () => {
      expect(getFitScoreBadgeClass(70)).toBe("bg-emerald-100 text-emerald-700");
      expect(getFitScoreBadgeClass(100)).toBe(
        "bg-emerald-100 text-emerald-700",
      );
    });

    it("returns orange for scores >= 50 and < 70", () => {
      expect(getFitScoreBadgeClass(50)).toBe("bg-orange-100 text-orange-700");
      expect(getFitScoreBadgeClass(69)).toBe("bg-orange-100 text-orange-700");
    });

    it("returns red for scores < 50", () => {
      expect(getFitScoreBadgeClass(49)).toBe("bg-red-100 text-red-700");
      expect(getFitScoreBadgeClass(0)).toBe("bg-red-100 text-red-700");
    });
  });

  describe("formatSchoolStatus", () => {
    it("capitalizes single word statuses", () => {
      expect(formatSchoolStatus("researching")).toBe("Researching");
      expect(formatSchoolStatus("contacted")).toBe("Contacted");
    });

    it("capitalizes and joins multi-word statuses", () => {
      expect(formatSchoolStatus("offer_received")).toBe("Offer Received");
    });
  });
});
