import { describe, it, expect } from "vitest";
import { extractStateFromLocation } from "~/utils/locationParser";

describe("extractStateFromLocation", () => {
  it("extracts two-letter state from 'City, ST' format", () => {
    expect(extractStateFromLocation("Berea, OH")).toBe("OH");
    expect(extractStateFromLocation("Fairfax, VA")).toBe("VA");
    expect(extractStateFromLocation("Washington, DC")).toBe("DC");
  });

  it("extracts state from 'City, ST ZIP' format (with zip code)", () => {
    expect(extractStateFromLocation("Boston, MA 02215")).toBe("MA");
  });

  it("handles extra whitespace after comma", () => {
    expect(extractStateFromLocation("Austin,  TX")).toBe("TX");
  });

  it("returns null when there is no comma in the string", () => {
    expect(extractStateFromLocation("Ohio")).toBeNull();
  });

  it("returns null when state abbreviation is lowercase", () => {
    // Regex requires [A-Z]{2}
    expect(extractStateFromLocation("Boston, ma")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractStateFromLocation("")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractStateFromLocation(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(extractStateFromLocation(undefined)).toBeNull();
  });

  it("returns null when comma is present but no valid state follows", () => {
    expect(extractStateFromLocation("City, 12345")).toBeNull();
    expect(extractStateFromLocation("City, Unknown")).toBeNull();
  });

  it("returns null when state is more than two letters", () => {
    // 'OHI' is three letters — should not match the two-letter requirement
    expect(extractStateFromLocation("City, OHI")).toBeNull();
  });

  it("handles trailing suffix after state (dash pattern)", () => {
    // Pattern allows ", ST - suffix" via (?:\s*-.*)?$
    expect(extractStateFromLocation("Denver, CO - Metro")).toBe("CO");
  });
});
