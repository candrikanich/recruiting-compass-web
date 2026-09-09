import { describe, it, expect } from "vitest";
import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";

describe("lookupSchoolMetadata", () => {
  it("returns mascot and athletics URL for an exact schoolMetadata.json match", () => {
    const result = lookupSchoolMetadata("Abilene Christian University");
    expect(result.mascot).toBe("Wildcats");
    expect(result.athleticsUrl).toBe("https://www.acusports.com");
  });

  it("resolves conferenceUrl by joining the school's conference (from ncaaSchools.json) against conferenceUrls.json", () => {
    // Auburn University -> "Southeastern Conference" -> conferenceUrls.json "SEC"
    const result = lookupSchoolMetadata("Auburn University");
    expect(result.conferenceUrl).toBe("https://www.secsports.com");
  });

  it("matches 'University of X' against a 'X University' style seed entry (name-normalization)", () => {
    const direct = lookupSchoolMetadata("University of Alabama");
    const reordered = lookupSchoolMetadata("Alabama University");
    expect(direct.mascot).not.toBeNull();
    expect(reordered.mascot).toBe(direct.mascot);
  });

  it("falls back to ncaaSchools.json athleticWebsite when a school isn't in schoolMetadata.json, prefixing https://", () => {
    // Present in ncaaSchools.json only (not schoolMetadata.json), scheme-less athleticWebsite
    const result = lookupSchoolMetadata("Millersville University of Pennsylvania");
    expect(result.athleticsUrl).toBe("https://www.millersvilleathletics.com");
  });

  it("returns all-null fields for a school not found in any seed file, never throws", () => {
    expect(() => lookupSchoolMetadata("Definitely Not A Real School XYZ123")).not.toThrow();
    const result = lookupSchoolMetadata("Definitely Not A Real School XYZ123");
    expect(result).toEqual({
      mascot: null,
      athleticsUrl: null,
      colors: null,
      conferenceUrl: null,
    });
  });

  it("returns nulls for empty or whitespace-only input, never throws", () => {
    expect(lookupSchoolMetadata("")).toEqual({
      mascot: null,
      athleticsUrl: null,
      colors: null,
      conferenceUrl: null,
    });
    expect(lookupSchoolMetadata("   ")).toEqual({
      mascot: null,
      athleticsUrl: null,
      colors: null,
      conferenceUrl: null,
    });
  });

  it("is case-insensitive", () => {
    const result = lookupSchoolMetadata("abilene christian university");
    expect(result.mascot).toBe("Wildcats");
  });
});
