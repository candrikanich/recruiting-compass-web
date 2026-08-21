import { describe, it, expect } from "vitest";
import {
  SCHOOL_STATUS_OPTIONS,
  getSchoolStatusLabel,
  getSchoolStatusBadgeClass,
} from "~/utils/schoolStatusOptions";

describe("schoolStatusOptions", () => {
  it("exposes the 6 canonical statuses in funnel order", () => {
    expect(SCHOOL_STATUS_OPTIONS.map((o) => o.value)).toEqual([
      "researching",
      "contacted",
      "visiting",
      "offer_received",
      "committed",
      "not_pursuing",
    ]);
  });

  it("does not expose unknown, declined, or legacy values as selectable options", () => {
    const values = SCHOOL_STATUS_OPTIONS.map((o) => o.value);
    expect(values).not.toContain("unknown");
    expect(values).not.toContain("declined");
    expect(values).not.toContain("interested");
    expect(values).not.toContain("camp_invite");
    expect(values).not.toContain("recruited");
    expect(values).not.toContain("official_visit_invited");
    expect(values).not.toContain("official_visit_scheduled");
  });

  it("labels match the iOS displayName vocabulary", () => {
    expect(getSchoolStatusLabel("researching")).toBe("Researching");
    expect(getSchoolStatusLabel("visiting")).toBe("Visiting");
    expect(getSchoolStatusLabel("offer_received")).toBe("Offer Received");
    expect(getSchoolStatusLabel("not_pursuing")).toBe("Not Pursuing");
  });

  it("falls back to Title-Cased snake_case for unmapped/legacy values", () => {
    expect(getSchoolStatusLabel("declined")).toBe("Declined");
    expect(getSchoolStatusLabel("camp_invite")).toBe("Camp Invite");
    expect(getSchoolStatusLabel("some_legacy_value")).toBe("Some Legacy Value");
  });

  it("returns the iOS 100/700 badge palette per status", () => {
    expect(getSchoolStatusBadgeClass("committed")).toBe(
      "bg-emerald-100 text-emerald-700",
    );
    expect(getSchoolStatusBadgeClass("not_pursuing")).toBe(
      "bg-red-100 text-red-700",
    );
    expect(getSchoolStatusBadgeClass("contacted")).toBe(
      "bg-blue-100 text-blue-700",
    );
  });

  it("returns a safe fallback badge class for unknown values", () => {
    expect(getSchoolStatusBadgeClass("unknown")).toBe(
      "bg-slate-100 text-slate-700",
    );
  });
});
