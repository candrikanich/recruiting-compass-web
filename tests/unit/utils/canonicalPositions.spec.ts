import { describe, it, expect } from "vitest";
import {
  SPORT_POSITIONS,
  getCanonicalPositions,
  normalizePosition,
  normalizePositions,
  isCanonicalPosition,
} from "~/utils/positions/canonical";

describe("canonical positions", () => {
  describe("SPORT_POSITIONS / getCanonicalPositions", () => {
    it("offers real granular baseball positions and NOT the coarse 'Infielder'/'Outfielder'", () => {
      const baseball = getCanonicalPositions("Baseball");
      expect(baseball).toContain("Shortstop");
      expect(baseball).toContain("Second Base");
      expect(baseball).toContain("Center Field");
      expect(baseball).toContain("Utility");
      expect(baseball).not.toContain("Infielder");
      expect(baseball).not.toContain("Outfielder");
    });

    it("returns [] for an unknown sport", () => {
      expect(getCanonicalPositions("Quidditch")).toEqual([]);
      expect(getCanonicalPositions(null)).toEqual([]);
    });

    it("returns a copy (callers can't mutate the source)", () => {
      const a = getCanonicalPositions("Soccer");
      a.push("Sweeper");
      expect(getCanonicalPositions("Soccer")).not.toContain("Sweeper");
    });
  });

  describe("normalizePosition (sport-scoped)", () => {
    it("maps the coarse legacy 'Infielder'/'Outfielder' to Utility", () => {
      expect(normalizePosition("Baseball", "Infielder")).toBe("Utility");
      expect(normalizePosition("Baseball", "Outfielder")).toBe("Utility");
      expect(normalizePosition("Softball", "Infielder")).toBe("Utility");
    });

    it("expands baseball abbreviations to full names", () => {
      expect(normalizePosition("Baseball", "P")).toBe("Pitcher");
      expect(normalizePosition("Baseball", "1B")).toBe("First Base");
      expect(normalizePosition("Baseball", "SS")).toBe("Shortstop");
      expect(normalizePosition("Baseball", "CF")).toBe("Center Field");
    });

    it("passes through values that are already canonical (case-insensitive)", () => {
      expect(normalizePosition("Baseball", "Shortstop")).toBe("Shortstop");
      expect(normalizePosition("Baseball", "second base")).toBe("Second Base");
      expect(normalizePosition("Basketball", "Point Guard")).toBe("Point Guard");
    });

    it("resolves the C collision by sport: Catcher (baseball) vs Center (basketball)", () => {
      expect(normalizePosition("Baseball", "C")).toBe("Catcher");
      expect(normalizePosition("Basketball", "C")).toBe("Center");
    });

    it("resolves the P collision by sport: Pitcher (baseball) vs Punter (football)", () => {
      expect(normalizePosition("Baseball", "P")).toBe("Pitcher");
      expect(normalizePosition("Football", "P")).toBe("Punter");
    });

    it("maps common basketball/football/soccer abbreviations", () => {
      expect(normalizePosition("Basketball", "PG")).toBe("Point Guard");
      expect(normalizePosition("Football", "WR")).toBe("Wide Receiver");
      expect(normalizePosition("Soccer", "GK")).toBe("Goalkeeper");
    });

    it("returns null for unknown values or unknown sport", () => {
      expect(normalizePosition("Baseball", "Rover")).toBeNull();
      expect(normalizePosition("Quidditch", "Seeker")).toBeNull();
      expect(normalizePosition("Baseball", "")).toBeNull();
      expect(normalizePosition(null, "SS")).toBeNull();
    });
  });

  describe("normalizePositions (array)", () => {
    it("canonicalizes a mixed-vocabulary array, de-duplicating", () => {
      // Real prod data had both abbreviations and full names in one array.
      expect(
        normalizePositions("Baseball", ["P", "Pitcher", "SS", "Shortstop", "1B"]),
      ).toEqual(["Pitcher", "Shortstop", "First Base"]);
    });

    it("preserves unresolved entries instead of dropping them (no data loss)", () => {
      expect(normalizePositions("Baseball", ["SS", "Rover", "2B"])).toEqual([
        "Shortstop",
        "Rover",
        "Second Base",
      ]);
    });

    it("preserves values as-is when the sport is unknown/missing", () => {
      expect(normalizePositions(undefined, ["P", "SS"])).toEqual(["P", "SS"]);
    });

    it("returns [] for non-arrays", () => {
      expect(normalizePositions("Baseball", null)).toEqual([]);
      expect(normalizePositions("Baseball", undefined)).toEqual([]);
    });
  });

  describe("isCanonicalPosition", () => {
    it("is true only for canonical values of that sport", () => {
      expect(isCanonicalPosition("Baseball", "Shortstop")).toBe(true);
      expect(isCanonicalPosition("Baseball", "SS")).toBe(false);
      expect(isCanonicalPosition("Baseball", "Infielder")).toBe(false);
      expect(isCanonicalPosition("Basketball", "Center")).toBe(true);
    });
  });
});
