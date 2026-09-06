import { describe, it, expect } from "vitest";
import { getConferenceUrl } from "~/utils/conferenceUrls";

describe("getConferenceUrl", () => {
  it("resolves a known conference to its URL", () => {
    expect(getConferenceUrl("Big Ten")).toBe("https://bigten.org");
    expect(getConferenceUrl("SEC")).toBe("https://www.secsports.com");
  });

  it("returns null for an unknown conference", () => {
    expect(getConferenceUrl("Some Made Up Conference")).toBeNull();
  });

  it("returns null for null/undefined/empty input", () => {
    expect(getConferenceUrl(null)).toBeNull();
    expect(getConferenceUrl(undefined)).toBeNull();
    expect(getConferenceUrl("")).toBeNull();
  });

  it("is exact-match, not case-insensitive", () => {
    expect(getConferenceUrl("big ten")).toBeNull();
  });
});
