import { describe, it, expect } from "vitest";
import {
  SPORT_POSITIONS,
  getCanonicalPositions,
  normalizePosition,
  normalizePositions,
  isCanonicalPosition,
  abbreviatePosition,
  formatPositionsShort,
} from "~/utils/positions/canonical";

describe("canonical positions", () => {
  describe("SPORT_POSITIONS / getCanonicalPositions", () => {
    it("offers real granular baseball positions and NOT the coarse 'Infielder'/'Outfielder'/'Utility'", () => {
      const baseball = getCanonicalPositions("Baseball");
      expect(baseball).toContain("Shortstop");
      expect(baseball).toContain("Second Base");
      expect(baseball).toContain("Center Field");
      // Vague catch-alls are gone — recruiting output must name a real position.
      expect(baseball).not.toContain("Utility");
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
    it("no longer resolves coarse legacy 'Infielder'/'Outfielder'/'Utility' (no fake specificity)", () => {
      expect(normalizePosition("Baseball", "Infielder")).toBeNull();
      expect(normalizePosition("Baseball", "Outfielder")).toBeNull();
      expect(normalizePosition("Baseball", "Utility")).toBeNull();
      expect(normalizePosition("Softball", "Infielder")).toBeNull();
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

    it("preserves de-canonicalized legacy 'Utility'/'Infielder' instead of dropping them", () => {
      // Utility was removed from the vocab; existing stored data must survive a
      // read so backfill (not a silent read) is what migrates it.
      expect(normalizePositions("Baseball", ["Utility", "SS"])).toEqual([
        "Utility",
        "Shortstop",
      ]);
      expect(normalizePositions("Baseball", ["Infielder", "3B"])).toEqual([
        "Infielder",
        "Third Base",
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

  describe("abbreviatePosition (sport-scoped)", () => {
    it("abbreviates baseball/softball full names to standard scorekeeping codes", () => {
      expect(abbreviatePosition("Baseball", "Third Base")).toBe("3B");
      expect(abbreviatePosition("Baseball", "Shortstop")).toBe("SS");
      expect(abbreviatePosition("Baseball", "Pitcher")).toBe("P");
      expect(abbreviatePosition("Baseball", "Center Field")).toBe("CF");
      expect(abbreviatePosition("Softball", "Designated Hitter")).toBe("DH");
    });

    it("accepts an already-abbreviated or aliased value via canonicalization first", () => {
      expect(abbreviatePosition("Baseball", "SS")).toBe("SS");
      expect(abbreviatePosition("Baseball", "shortstop")).toBe("SS");
    });

    it("falls back to the canonical full name when a sport has no abbreviation map", () => {
      expect(abbreviatePosition("Basketball", "Point Guard")).toBe("Point Guard");
      expect(abbreviatePosition("Soccer", "Goalkeeper")).toBe("Goalkeeper");
    });

    it("returns the trimmed input unchanged for unknown/blank values", () => {
      expect(abbreviatePosition("Baseball", "Rover")).toBe("Rover");
      expect(abbreviatePosition("Baseball", "  ")).toBe("");
      expect(abbreviatePosition(null, "SS")).toBe("SS");
    });
  });

  describe("formatPositionsShort (ordered primary/secondary)", () => {
    it("joins the first two entered positions, abbreviated, primary first", () => {
      expect(
        formatPositionsShort("Baseball", ["Third Base", "Shortstop", "Pitcher"]),
      ).toBe("3B/SS");
    });

    it("renders just the primary when there is no secondary", () => {
      expect(formatPositionsShort("Baseball", ["Third Base"])).toBe("3B");
    });

    it("falls back to the primary_position argument when the array is empty", () => {
      expect(formatPositionsShort("Baseball", [], "Shortstop")).toBe("SS");
    });

    it("uses entered positions over the fallback (fallback is last resort)", () => {
      expect(
        formatPositionsShort("Baseball", ["Third Base", "Shortstop"], "Utility"),
      ).toBe("3B/SS");
    });

    it("skips a secondary that duplicates the primary", () => {
      expect(
        formatPositionsShort("Baseball", ["Third Base", "Third Base"]),
      ).toBe("3B");
    });

    it("returns '' when nothing is entered and no fallback", () => {
      expect(formatPositionsShort("Baseball", [])).toBe("");
      expect(formatPositionsShort("Baseball", undefined)).toBe("");
    });

    it("preserves a de-canonicalized legacy value as the fallback render", () => {
      // Owen pre-backfill: array empty, primary still the stale "Utility".
      expect(formatPositionsShort("Baseball", [], "Utility")).toBe("Utility");
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
