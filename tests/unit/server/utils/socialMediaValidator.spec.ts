import { describe, it, expect } from "vitest";
import {
  isValidTwitterHandle,
  isValidInstagramHandle,
  normalizeHandle,
  validateAndNormalizeHandle,
  filterValidHandles,
} from "~/server/utils/socialMediaValidator";

describe("server/utils/socialMediaValidator", () => {
  describe("isValidTwitterHandle", () => {
    it("accepts a valid handle with @ prefix", () => {
      expect(isValidTwitterHandle("@coach_smith")).toBe(true);
    });

    it("accepts a valid handle without @ prefix", () => {
      expect(isValidTwitterHandle("coach_smith")).toBe(true);
    });

    it("rejects a handle starting with a number", () => {
      expect(isValidTwitterHandle("1coach")).toBe(false);
    });

    it("rejects a handle over 30 characters", () => {
      expect(isValidTwitterHandle("a".repeat(31))).toBe(false);
    });

    it("rejects null/empty input", () => {
      expect(isValidTwitterHandle("")).toBe(false);
      expect(isValidTwitterHandle(null as unknown as string)).toBe(false);
    });
  });

  describe("isValidInstagramHandle", () => {
    it("accepts a valid handle with periods and underscores", () => {
      expect(isValidInstagramHandle("coach.smith_1")).toBe(true);
    });

    it("rejects a handle starting with a period", () => {
      expect(isValidInstagramHandle(".coach")).toBe(false);
    });

    it("rejects a handle starting with an underscore", () => {
      expect(isValidInstagramHandle("_coach")).toBe(false);
    });

    it("rejects consecutive special characters", () => {
      expect(isValidInstagramHandle("coach..smith")).toBe(false);
    });

    it("rejects null/empty input", () => {
      expect(isValidInstagramHandle("")).toBe(false);
    });
  });

  describe("normalizeHandle", () => {
    it("strips leading @ and lowercases", () => {
      expect(normalizeHandle("@Coach_Smith")).toBe("coach_smith");
    });

    it("trims whitespace", () => {
      expect(normalizeHandle("  coach  ")).toBe("coach");
    });

    it("returns empty string for null/undefined input", () => {
      expect(normalizeHandle(null as unknown as string)).toBe("");
    });
  });

  describe("validateAndNormalizeHandle", () => {
    it("returns valid + normalized for a good Twitter handle", () => {
      expect(validateAndNormalizeHandle("@Coach_Smith", "twitter")).toEqual({
        valid: true,
        normalized: "coach_smith",
      });
    });

    it("returns invalid with error for a bad Twitter handle", () => {
      const result = validateAndNormalizeHandle("1bad", "twitter");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Twitter");
    });

    it("returns invalid with error for a bad Instagram handle", () => {
      const result = validateAndNormalizeHandle("_bad", "instagram");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Instagram");
    });

    it("returns invalid when handle is missing", () => {
      expect(validateAndNormalizeHandle("", "twitter")).toEqual({
        valid: false,
        error: "Handle is required",
      });
    });
  });

  describe("filterValidHandles", () => {
    it("keeps only valid, normalized handles for the given platform", () => {
      expect(
        filterValidHandles(
          ["@Coach_Smith", "1bad", null, undefined, "coach_jones"],
          "twitter",
        ),
      ).toEqual(["coach_smith", "coach_jones"]);
    });

    it("returns an empty array when nothing is valid", () => {
      expect(filterValidHandles(["1bad", ".bad"], "twitter")).toEqual([]);
    });
  });
});
