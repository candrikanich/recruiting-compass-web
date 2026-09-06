import { describe, it, expect } from "vitest";
import scholarshipLimits from "~/data/scholarshipLimits.json";

const APP_SPORTS = [
  "Baseball",
  "Softball",
  "Basketball",
  "Football",
  "Soccer",
  "Volleyball",
  "Track & Field",
  "Cross Country",
  "Swimming",
  "Golf",
  "Tennis",
  "Wrestling",
  "Lacrosse",
  "Ice Hockey",
  "Field Hockey",
  "Rowing",
  "Water Polo",
  "Gymnastics",
  "Beach Volleyball",
];
const DIVISIONS = ["D1", "D2", "D3", "NAIA", "JUCO"];

describe("data/scholarshipLimits.json", () => {
  const entries = Object.entries(
    scholarshipLimits as Record<
      string,
      {
        sport: string;
        division: string;
        total: number | null;
        headCount: number | null;
        equivalency: number | null;
        notes: string | null;
      }
    >,
  );

  it("covers every AppSport across every division exactly once", () => {
    expect(entries).toHaveLength(APP_SPORTS.length * DIVISIONS.length);
    const seen = new Set(entries.map(([, v]) => `${v.sport}_${v.division}`));
    expect(seen.size).toBe(entries.length);
  });

  it("uses only known AppSport values and known divisions", () => {
    for (const [, v] of entries) {
      expect(APP_SPORTS).toContain(v.sport);
      expect(DIVISIONS).toContain(v.division);
    }
  });

  it("every entry has a notes string explaining the figure", () => {
    for (const [key, v] of entries) {
      expect(v.notes, `${key} missing notes`).toBeTruthy();
    }
  });

  it("D3 rows are always zero/null (no athletic scholarships)", () => {
    for (const [, v] of entries.filter(([, v]) => v.division === "D3")) {
      expect(v.total === 0 || v.total === null).toBe(true);
      expect(v.headCount).toBeNull();
      expect(v.equivalency).toBeNull();
    }
  });

  it("no entry sets both headCount and equivalency", () => {
    for (const [key, v] of entries) {
      expect(
        v.headCount != null && v.equivalency != null,
        `${key} sets both headCount and equivalency`,
      ).toBe(false);
    }
  });
});
