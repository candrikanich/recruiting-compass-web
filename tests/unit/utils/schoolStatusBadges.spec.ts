import { describe, it, expect } from "vitest";
import { getStatusBadgeColor } from "~/utils/schoolStatusBadges";

describe("schoolStatusBadges", () => {
  describe("getStatusBadgeColor", () => {
    it("returns correct color for interested status", () => {
      expect(getStatusBadgeColor("interested")).toBe(
        "bg-blue-100 text-blue-700",
      );
    });

    it("returns correct color for contacted status", () => {
      expect(getStatusBadgeColor("contacted")).toBe(
        "bg-slate-100 text-slate-700",
      );
    });

    it("returns correct color for researching status", () => {
      expect(getStatusBadgeColor("researching")).toBe(
        "bg-slate-100 text-slate-700",
      );
    });

    it("returns correct color for camp_invite status", () => {
      expect(getStatusBadgeColor("camp_invite")).toBe(
        "bg-purple-100 text-purple-700",
      );
    });

    it("returns correct color for recruited status", () => {
      expect(getStatusBadgeColor("recruited")).toBe(
        "bg-green-100 text-green-700",
      );
    });

    it("returns correct color for official_visit_invited status", () => {
      expect(getStatusBadgeColor("official_visit_invited")).toBe(
        "bg-amber-100 text-amber-700",
      );
    });

    it("returns correct color for official_visit_scheduled status", () => {
      expect(getStatusBadgeColor("official_visit_scheduled")).toBe(
        "bg-orange-100 text-orange-700",
      );
    });

    it("returns correct color for offer_received status", () => {
      expect(getStatusBadgeColor("offer_received")).toBe(
        "bg-red-100 text-red-700",
      );
    });

    it("returns correct color for committed status", () => {
      expect(getStatusBadgeColor("committed")).toBe("bg-green-800 text-white");
    });

    it("returns correct color for not_pursuing status", () => {
      expect(getStatusBadgeColor("not_pursuing")).toBe(
        "bg-gray-300 text-gray-700",
      );
    });

    it("returns default color for unknown status", () => {
      expect(getStatusBadgeColor("unknown_status")).toBe(
        "bg-slate-100 text-slate-700",
      );
    });

    it("returns default color for empty string", () => {
      expect(getStatusBadgeColor("")).toBe("bg-slate-100 text-slate-700");
    });

    it("returns default color for status with special characters", () => {
      expect(getStatusBadgeColor("status-with-dashes")).toBe(
        "bg-slate-100 text-slate-700",
      );
    });

    it("handles case-sensitive status strings", () => {
      // Status strings should be lowercase, but test for consistency
      expect(getStatusBadgeColor("Interested")).toBe(
        "bg-slate-100 text-slate-700",
      );
      expect(getStatusBadgeColor("CONTACTED")).toBe(
        "bg-slate-100 text-slate-700",
      );
    });
  });
});
