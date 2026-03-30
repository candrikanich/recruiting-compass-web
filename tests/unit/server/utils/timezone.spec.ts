import { describe, it, expect } from "vitest";
import { deriveTimezone } from "~/server/utils/timezone";

describe("deriveTimezone", () => {
  it("maps NY to Eastern", () =>
    expect(deriveTimezone("NY")).toBe("America/New_York"));
  it("maps TX to Central", () =>
    expect(deriveTimezone("TX")).toBe("America/Chicago"));
  it("maps CO to Mountain", () =>
    expect(deriveTimezone("CO")).toBe("America/Denver"));
  it("maps AZ to Mountain", () =>
    expect(deriveTimezone("AZ")).toBe("America/Denver"));
  it("maps CA to Pacific", () =>
    expect(deriveTimezone("CA")).toBe("America/Los_Angeles"));
  it("defaults unknown state to Eastern", () =>
    expect(deriveTimezone("ZZ")).toBe("America/New_York"));
  it("defaults null to Eastern", () =>
    expect(deriveTimezone(null)).toBe("America/New_York"));
  it("is case-insensitive", () =>
    expect(deriveTimezone("ny")).toBe("America/New_York"));
});
