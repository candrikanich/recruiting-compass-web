import { describe, it, expect } from "vitest";
import {
  AVAILABLE_VARIABLES,
  getVariable,
  getVariableNames,
} from "~/utils/templateVariables";

describe("templateVariables", () => {
  describe("getVariable", () => {
    it("returns the matching variable for a known key", () => {
      const result = getVariable("playerName");
      expect(result).toEqual(
        expect.objectContaining({ key: "playerName", name: "Player Name" }),
      );
    });

    it("returns undefined for an unknown key", () => {
      expect(getVariable("notARealKey")).toBeUndefined();
    });
  });

  describe("getVariableNames", () => {
    it("returns every variable formatted as {{key}}", () => {
      const names = getVariableNames();
      expect(names).toHaveLength(AVAILABLE_VARIABLES.length);
      expect(names).toContain("{{playerName}}");
      expect(names).toContain("{{schoolName}}");
      expect(names.every((n) => n.startsWith("{{") && n.endsWith("}}"))).toBe(
        true,
      );
    });
  });
});
