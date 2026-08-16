import { describe, it, expect } from "vitest";
import {
  ageFromDateOfBirth,
  isUnderMinimumAge,
  MINIMUM_AGE,
} from "~/utils/age";

const yearsAgo = (years: number, month = "06", day = "15") =>
  `${new Date().getFullYear() - years}-${month}-${day}`;

describe("ageFromDateOfBirth", () => {
  it("returns null for missing input", () => {
    expect(ageFromDateOfBirth(null)).toBeNull();
    expect(ageFromDateOfBirth(undefined)).toBeNull();
    expect(ageFromDateOfBirth("")).toBeNull();
  });

  it("returns null for an invalid calendar date", () => {
    expect(ageFromDateOfBirth("not-a-date")).toBeNull();
    expect(ageFromDateOfBirth("2020-13-40")).toBeNull();
  });

  it("computes whole years, accounting for birthday not yet reached", () => {
    expect(ageFromDateOfBirth(yearsAgo(20))).toBe(20);
    // Birthday is tomorrow-ish → still one year younger
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    expect(ageFromDateOfBirth(`${now.getFullYear() - 15}-${mm}-${dd}`)).toBe(14);
  });
});

describe("isUnderMinimumAge", () => {
  it("is false when no DOB is provided (fails open)", () => {
    expect(isUnderMinimumAge(null)).toBe(false);
    expect(isUnderMinimumAge("")).toBe(false);
  });

  it(`is true below ${MINIMUM_AGE} and false at/above`, () => {
    expect(isUnderMinimumAge(yearsAgo(10))).toBe(true);
    expect(isUnderMinimumAge(yearsAgo(MINIMUM_AGE))).toBe(false);
    expect(isUnderMinimumAge(yearsAgo(30))).toBe(false);
  });
});
