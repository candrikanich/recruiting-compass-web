import { describe, it, expect } from "vitest";
import {
  BASEBALL_POSITIONS,
  normalizePosition,
  normalizePositions,
  isValidPosition,
  getPositionFullName,
} from "~/utils/positions";

describe("utils/positions", () => {
  describe("BASEBALL_POSITIONS constant", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(BASEBALL_POSITIONS)).toBe(true);
      expect(BASEBALL_POSITIONS.length).toBeGreaterThan(0);
    });

    it("each entry has value, label, and fullName", () => {
      for (const pos of BASEBALL_POSITIONS) {
        expect(pos).toHaveProperty("value");
        expect(pos).toHaveProperty("label");
        expect(pos).toHaveProperty("fullName");
      }
    });

    it("includes all standard positions", () => {
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
  });

  describe("normalizePosition", () => {
    describe("canonical abbreviated input", () => {
      it("normalizes 'P' to 'P'", () => {
        expect(normalizePosition("P")).toBe("P");
      });

      it("normalizes 'SS' to 'SS'", () => {
        expect(normalizePosition("SS")).toBe("SS");
      });

      it("normalizes '1B' to '1B'", () => {
        expect(normalizePosition("1B")).toBe("1B");
      });

      it("normalizes '2B' to '2B'", () => {
        expect(normalizePosition("2B")).toBe("2B");
      });

      it("normalizes '3B' to '3B'", () => {
        expect(normalizePosition("3B")).toBe("3B");
      });

      it("normalizes 'DH' to 'DH'", () => {
        expect(normalizePosition("DH")).toBe("DH");
      });

      it("normalizes 'UTIL' to 'UTIL'", () => {
        expect(normalizePosition("UTIL")).toBe("UTIL");
      });

      it("normalizes 'LF', 'CF', 'RF' correctly", () => {
        expect(normalizePosition("LF")).toBe("LF");
        expect(normalizePosition("CF")).toBe("CF");
        expect(normalizePosition("RF")).toBe("RF");
      });
    });

    describe("full name input", () => {
      it("normalizes 'Pitcher' to 'P'", () => {
        expect(normalizePosition("Pitcher")).toBe("P");
      });

      it("normalizes 'Catcher' to 'C'", () => {
        expect(normalizePosition("Catcher")).toBe("C");
      });

      it("normalizes 'Shortstop' to 'SS'", () => {
        expect(normalizePosition("Shortstop")).toBe("SS");
      });

      it("normalizes 'First Base' to '1B'", () => {
        expect(normalizePosition("First Base")).toBe("1B");
      });

      it("normalizes 'Second Base' to '2B'", () => {
        expect(normalizePosition("Second Base")).toBe("2B");
      });

      it("normalizes 'Third Base' to '3B'", () => {
        expect(normalizePosition("Third Base")).toBe("3B");
      });

      it("normalizes 'Left Field' to 'LF'", () => {
        expect(normalizePosition("Left Field")).toBe("LF");
      });

      it("normalizes 'Center Field' to 'CF'", () => {
        expect(normalizePosition("Center Field")).toBe("CF");
      });

      it("normalizes 'Right Field' to 'RF'", () => {
        expect(normalizePosition("Right Field")).toBe("RF");
      });

      it("normalizes 'Designated Hitter' to 'DH'", () => {
        expect(normalizePosition("Designated Hitter")).toBe("DH");
      });

      it("normalizes 'Utility' to 'UTIL'", () => {
        expect(normalizePosition("Utility")).toBe("UTIL");
      });
    });

    describe("common variations", () => {
      it("normalizes '1st Base' to '1B'", () => {
        expect(normalizePosition("1st Base")).toBe("1B");
      });

      it("normalizes '2nd Base' to '2B'", () => {
        expect(normalizePosition("2nd Base")).toBe("2B");
      });

      it("normalizes '3rd Base' to '3B'", () => {
        expect(normalizePosition("3rd Base")).toBe("3B");
      });

      it("normalizes 'Short Stop' to 'SS'", () => {
        expect(normalizePosition("Short Stop")).toBe("SS");
      });

      it("normalizes 'Leftfield' to 'LF'", () => {
        expect(normalizePosition("Leftfield")).toBe("LF");
      });

      it("normalizes 'Centerfield' to 'CF'", () => {
        expect(normalizePosition("Centerfield")).toBe("CF");
      });

      it("normalizes 'Rightfield' to 'RF'", () => {
        expect(normalizePosition("Rightfield")).toBe("RF");
      });

      it("normalizes broad categories 'Infield' and 'Outfield' to 'UTIL'", () => {
        expect(normalizePosition("Infield")).toBe("UTIL");
        expect(normalizePosition("Outfield")).toBe("UTIL");
      });

      it("normalizes 'IF' and 'OF' to 'UTIL'", () => {
        expect(normalizePosition("IF")).toBe("UTIL");
        expect(normalizePosition("OF")).toBe("UTIL");
      });
    });

    describe("case-insensitive matching", () => {
      it("normalizes lowercase 'pitcher' to 'P'", () => {
        expect(normalizePosition("pitcher")).toBe("P");
      });

      it("normalizes lowercase 'shortstop' to 'SS'", () => {
        expect(normalizePosition("shortstop")).toBe("SS");
      });

      it("normalizes uppercase 'PITCHER' to 'P'", () => {
        expect(normalizePosition("PITCHER")).toBe("P");
      });

      it("normalizes mixed case 'First base' to '1B'", () => {
        expect(normalizePosition("first base")).toBe("1B");
      });
    });

    describe("whitespace handling", () => {
      it("trims leading and trailing whitespace", () => {
        expect(normalizePosition("  P  ")).toBe("P");
        expect(normalizePosition("  Pitcher  ")).toBe("P");
      });
    });

    describe("invalid input", () => {
      it("returns null for unknown position string", () => {
        expect(normalizePosition("invalid")).toBeNull();
      });

      it("returns null for empty string", () => {
        expect(normalizePosition("")).toBeNull();
      });

      it("returns null for whitespace-only string", () => {
        expect(normalizePosition("   ")).toBeNull();
      });
    });
  });

  describe("normalizePositions", () => {
    it("returns [] for null", () => {
      expect(normalizePositions(null)).toEqual([]);
    });

    it("returns [] for undefined", () => {
      expect(normalizePositions(undefined)).toEqual([]);
    });

    it("returns [] for empty array", () => {
      expect(normalizePositions([])).toEqual([]);
    });

    it("normalizes an array of valid positions", () => {
      const result = normalizePositions(["Pitcher", "Catcher", "SS"]);
      expect(result).toEqual(["P", "C", "SS"]);
    });

    it("filters out invalid positions", () => {
      const result = normalizePositions(["Pitcher", "invalid", "SS"]);
      expect(result).toContain("P");
      expect(result).toContain("SS");
      expect(result).not.toContain(null);
      expect(result.length).toBe(2);
    });

    it("deduplicates positions", () => {
      // "Pitcher", "P", and "pitcher" all map to "P"
      const result = normalizePositions(["Pitcher", "P", "pitcher"]);
      expect(result).toEqual(["P"]);
    });

    it("deduplicates same canonical value from different input forms", () => {
      const result = normalizePositions(["Outfield", "OF", "SS", "shortstop"]);
      expect(result).toContain("UTIL");
      expect(result).toContain("SS");
      // "Outfield" and "OF" both map to "UTIL", so only one "UTIL"
      const utilCount = result.filter((p) => p === "UTIL").length;
      expect(utilCount).toBe(1);
    });

    it("handles array with all invalid values", () => {
      const result = normalizePositions(["foo", "bar", "baz"]);
      expect(result).toEqual([]);
    });

    it("preserves order of first occurrence", () => {
      const result = normalizePositions(["SS", "P", "C"]);
      expect(result).toEqual(["SS", "P", "C"]);
    });
  });

  describe("isValidPosition", () => {
    it("returns true for canonical abbreviated positions", () => {
      expect(isValidPosition("P")).toBe(true);
      expect(isValidPosition("C")).toBe(true);
      expect(isValidPosition("1B")).toBe(true);
      expect(isValidPosition("2B")).toBe(true);
      expect(isValidPosition("3B")).toBe(true);
      expect(isValidPosition("SS")).toBe(true);
      expect(isValidPosition("LF")).toBe(true);
      expect(isValidPosition("CF")).toBe(true);
      expect(isValidPosition("RF")).toBe(true);
      expect(isValidPosition("DH")).toBe(true);
      expect(isValidPosition("UTIL")).toBe(true);
    });

    it("returns false for full name (not canonical)", () => {
      expect(isValidPosition("Pitcher")).toBe(false);
      expect(isValidPosition("Shortstop")).toBe(false);
    });

    it("returns false for invalid string", () => {
      expect(isValidPosition("invalid")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidPosition("")).toBe(false);
    });

    it("returns false for lowercase canonical abbreviation", () => {
      expect(isValidPosition("p")).toBe(false);
      expect(isValidPosition("ss")).toBe(false);
    });
  });

  describe("getPositionFullName", () => {
    it("returns 'Pitcher' for 'P'", () => {
      expect(getPositionFullName("P")).toBe("Pitcher");
    });

    it("returns 'Catcher' for 'C'", () => {
      expect(getPositionFullName("C")).toBe("Catcher");
    });

    it("returns 'Shortstop' for 'SS'", () => {
      expect(getPositionFullName("SS")).toBe("Shortstop");
    });

    it("returns 'First Base' for '1B'", () => {
      expect(getPositionFullName("1B")).toBe("First Base");
    });

    it("returns 'Second Base' for '2B'", () => {
      expect(getPositionFullName("2B")).toBe("Second Base");
    });

    it("returns 'Third Base' for '3B'", () => {
      expect(getPositionFullName("3B")).toBe("Third Base");
    });

    it("returns 'Left Field' for 'LF'", () => {
      expect(getPositionFullName("LF")).toBe("Left Field");
    });

    it("returns 'Center Field' for 'CF'", () => {
      expect(getPositionFullName("CF")).toBe("Center Field");
    });

    it("returns 'Right Field' for 'RF'", () => {
      expect(getPositionFullName("RF")).toBe("Right Field");
    });

    it("returns 'Designated Hitter' for 'DH'", () => {
      expect(getPositionFullName("DH")).toBe("Designated Hitter");
    });

    it("returns 'Utility' for 'UTIL'", () => {
      expect(getPositionFullName("UTIL")).toBe("Utility");
    });

    it("returns the original value for unknown input", () => {
      expect(getPositionFullName("unknown")).toBe("unknown");
      expect(getPositionFullName("Pitcher")).toBe("Pitcher");
      expect(getPositionFullName("")).toBe("");
    });
  });
});
