import { describe, it, expect } from "vitest";
import {
  BASEBALL_POSITIONS,
  normalizePosition,
  normalizePositions,
  isValidPosition,
  getPositionFullName,
} from "./positions";

describe("Position Normalization", () => {
  describe("normalizePosition", () => {
    it("should normalize abbreviated positions (already canonical)", () => {
      expect(normalizePosition("P")).toBe("P");
      expect(normalizePosition("C")).toBe("C");
      expect(normalizePosition("1B")).toBe("1B");
      expect(normalizePosition("SS")).toBe("SS");
    });

    it("should normalize full position names to abbreviations", () => {
      expect(normalizePosition("Pitcher")).toBe("P");
      expect(normalizePosition("Catcher")).toBe("C");
      expect(normalizePosition("First Base")).toBe("1B");
      expect(normalizePosition("Shortstop")).toBe("SS");
      expect(normalizePosition("Left Field")).toBe("LF");
    });

    it("should normalize broad categories to UTIL", () => {
      expect(normalizePosition("Infield")).toBe("UTIL");
      expect(normalizePosition("Outfield")).toBe("UTIL");
      expect(normalizePosition("IF")).toBe("UTIL");
      expect(normalizePosition("OF")).toBe("UTIL");
    });

    it("should be case-insensitive", () => {
      expect(normalizePosition("pitcher")).toBe("P");
      expect(normalizePosition("PITCHER")).toBe("P");
      expect(normalizePosition("ShortStop")).toBe("SS");
      expect(normalizePosition("leftfield")).toBe("LF");
    });

    it("should handle position variations", () => {
      expect(normalizePosition("1st Base")).toBe("1B");
      expect(normalizePosition("2nd Base")).toBe("2B");
      expect(normalizePosition("3rd Base")).toBe("3B");
      expect(normalizePosition("Short Stop")).toBe("SS");
      expect(normalizePosition("Centerfield")).toBe("CF");
    });

    it("should return null for invalid positions", () => {
      expect(normalizePosition("invalid")).toBeNull();
      expect(normalizePosition("")).toBeNull();
      expect(normalizePosition("  ")).toBeNull();
    });

    it("should handle null/undefined input", () => {
      expect(normalizePosition(null as any)).toBeNull();
      expect(normalizePosition(undefined as any)).toBeNull();
    });
  });

  describe("normalizePositions", () => {
    it("should normalize an array of positions", () => {
      const result = normalizePositions(["Pitcher", "Outfield", "P"]);
      expect(result).toEqual(["P", "UTIL"]);
    });

    it("should remove duplicates after normalization", () => {
      const result = normalizePositions(["Pitcher", "P", "pitcher"]);
      expect(result).toEqual(["P"]);
    });

    it("should filter out invalid positions", () => {
      const result = normalizePositions(["P", "invalid", "SS", "bad"]);
      expect(result).toEqual(["P", "SS"]);
    });

    it("should handle mixed formats", () => {
      const result = normalizePositions([
        "Shortstop",
        "Second Base",
        "P",
        "Outfield",
      ]);
      expect(result).toEqual(["SS", "2B", "P", "UTIL"]);
    });

    it("should handle empty array", () => {
      expect(normalizePositions([])).toEqual([]);
    });

    it("should handle null/undefined input", () => {
      expect(normalizePositions(null)).toEqual([]);
      expect(normalizePositions(undefined)).toEqual([]);
    });
  });

  describe("isValidPosition", () => {
    it("should return true for valid abbreviated positions", () => {
      expect(isValidPosition("P")).toBe(true);
      expect(isValidPosition("C")).toBe(true);
      expect(isValidPosition("SS")).toBe(true);
      expect(isValidPosition("UTIL")).toBe(true);
    });

    it("should return false for full names (not canonical)", () => {
      expect(isValidPosition("Pitcher")).toBe(false);
      expect(isValidPosition("Shortstop")).toBe(false);
    });

    it("should return false for invalid positions", () => {
      expect(isValidPosition("invalid")).toBe(false);
      expect(isValidPosition("")).toBe(false);
    });
  });

  describe("getPositionFullName", () => {
    it("should return full name for abbreviated position", () => {
      expect(getPositionFullName("P")).toBe("Pitcher");
      expect(getPositionFullName("C")).toBe("Catcher");
      expect(getPositionFullName("SS")).toBe("Shortstop");
      expect(getPositionFullName("UTIL")).toBe("Utility");
    });

    it("should return original value if not found", () => {
      expect(getPositionFullName("invalid")).toBe("invalid");
      expect(getPositionFullName("Pitcher")).toBe("Pitcher");
    });
  });

  describe("BASEBALL_POSITIONS constant", () => {
    it("should have 11 positions", () => {
      expect(BASEBALL_POSITIONS).toHaveLength(11);
    });

    it("should have all expected positions", () => {
      const values = BASEBALL_POSITIONS.map((p) => p.value);
      expect(values).toContain("P");
      expect(values).toContain("C");
      expect(values).toContain("1B");
      expect(values).toContain("2B");
      expect(values).toContain("3B");
      expect(values).toContain("SS");
      expect(values).toContain("LF");
      expect(values).toContain("CF");
      expect(values).toContain("RF");
      expect(values).toContain("DH");
      expect(values).toContain("UTIL");
    });

    it("should have full names for all positions", () => {
      BASEBALL_POSITIONS.forEach((pos) => {
        expect(pos.fullName).toBeTruthy();
        expect(pos.fullName.length).toBeGreaterThan(0);
      });
    });
  });
});
