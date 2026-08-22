import { describe, it, expect } from "vitest";
import {
  slugifyPlayerName,
  normalizeStateCode,
  buildPrepBaseballUrl,
} from "~/utils/recruitingLinks";

describe("slugifyPlayerName", () => {
  it("kebab-cases a first + last name", () => {
    expect(slugifyPlayerName("Owen Andrikanich")).toBe("owen-andrikanich");
  });
  it("collapses extra whitespace", () => {
    expect(slugifyPlayerName("  Owen   Andrikanich  ")).toBe(
      "owen-andrikanich",
    );
  });
  it("strips apostrophes and periods", () => {
    expect(slugifyPlayerName("O'Brien Jr.")).toBe("obrien-jr");
  });
  it("strips other punctuation to dashes and collapses them", () => {
    expect(slugifyPlayerName("Mary-Kate  O'Neil")).toBe("mary-kate-oneil");
  });
  it("returns empty string for empty/whitespace input", () => {
    expect(slugifyPlayerName("   ")).toBe("");
    expect(slugifyPlayerName("")).toBe("");
  });
});

describe("normalizeStateCode", () => {
  it("passes through a valid 2-letter code", () => {
    expect(normalizeStateCode("OH")).toBe("OH");
  });
  it("uppercases a lowercase code", () => {
    expect(normalizeStateCode("oh")).toBe("OH");
  });
  it("maps a full state name to its code", () => {
    expect(normalizeStateCode("Ohio")).toBe("OH");
    expect(normalizeStateCode("north carolina")).toBe("NC");
  });
  it("trims surrounding whitespace", () => {
    expect(normalizeStateCode("  OH  ")).toBe("OH");
  });
  it("returns null for an unknown value", () => {
    expect(normalizeStateCode("ZZ")).toBeNull();
    expect(normalizeStateCode("Narnia")).toBeNull();
    expect(normalizeStateCode("")).toBeNull();
    expect(normalizeStateCode(undefined)).toBeNull();
  });
});

describe("buildPrepBaseballUrl", () => {
  it("builds the canonical profile URL", () => {
    expect(buildPrepBaseballUrl("OH", "owen-andrikanich")).toBe(
      "https://www.prepbaseballreport.com/profiles/OH/owen-andrikanich",
    );
  });
  it("normalizes state and slug before building", () => {
    expect(buildPrepBaseballUrl("Ohio", "Owen Andrikanich")).toBe(
      "https://www.prepbaseballreport.com/profiles/OH/owen-andrikanich",
    );
  });
  it("returns null when state is missing or invalid", () => {
    expect(buildPrepBaseballUrl("", "owen-andrikanich")).toBeNull();
    expect(buildPrepBaseballUrl("Narnia", "owen-andrikanich")).toBeNull();
    expect(buildPrepBaseballUrl(undefined, "owen-andrikanich")).toBeNull();
  });
  it("returns null when slug is missing", () => {
    expect(buildPrepBaseballUrl("OH", "")).toBeNull();
    expect(buildPrepBaseballUrl("OH", "   ")).toBeNull();
    expect(buildPrepBaseballUrl("OH", undefined)).toBeNull();
  });
});
