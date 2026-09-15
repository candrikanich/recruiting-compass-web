import { describe, it, expect } from "vitest";
import {
  selectScholarshipLimit,
  formatScholarshipLine,
  type ScholarshipLimit,
} from "~/utils/scholarshipLimits";

const baseballD1: ScholarshipLimit = {
  sport: "baseball",
  division: "D1",
  total: 11.7,
  head_count: null,
  equivalency: 11.7,
  notes: "Equivalency sport",
};

const footballD1: ScholarshipLimit = {
  sport: "football",
  division: "D1_FBS",
  total: 85,
  head_count: 85,
  equivalency: null,
  notes: "Head count sport",
};

const rows = [baseballD1, footballD1];

describe("selectScholarshipLimit", () => {
  it("matches exact sport + division, case-insensitive sport", () => {
    expect(selectScholarshipLimit(rows, "Baseball", "D1")).toBe(baseballD1);
    expect(selectScholarshipLimit(rows, "football", "D1_FBS")).toBe(footballD1);
  });

  it("returns null on division mismatch", () => {
    expect(selectScholarshipLimit(rows, "baseball", "D2")).toBeNull();
  });

  it("returns null on sport mismatch (no wildcard fallback)", () => {
    expect(selectScholarshipLimit(rows, "softball", "D1")).toBeNull();
  });

  it("returns null when sport or division is missing", () => {
    expect(selectScholarshipLimit(rows, null, "D1")).toBeNull();
    expect(selectScholarshipLimit(rows, "baseball", undefined)).toBeNull();
  });
});

describe("formatScholarshipLine", () => {
  it("formats equivalency sports", () => {
    expect(formatScholarshipLine(baseballD1, "baseball", "D1")).toBe(
      "Athletic Scholarships: 11.7 equivalency (D1 Baseball)",
    );
  });

  it("formats head-count sports", () => {
    expect(formatScholarshipLine(footballD1, "football", "D1_FBS")).toBe(
      "Athletic Scholarships: 85 head-count (D1_FBS Football)",
    );
  });

  it("falls back to total when neither equivalency nor head_count is set", () => {
    const totalOnly: ScholarshipLimit = {
      sport: "golf",
      division: "D1",
      total: 4.5,
      head_count: null,
      equivalency: null,
      notes: null,
    };
    expect(formatScholarshipLine(totalOnly, "golf", "D1")).toBe(
      "Athletic Scholarships: 4.5 total (D1 Golf)",
    );
  });
});
