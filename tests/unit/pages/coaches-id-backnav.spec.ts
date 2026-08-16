import { describe, it, expect } from "vitest";
import { deriveBackLink } from "~/composables/useBackLink";

describe("deriveBackLink", () => {
  it("uses sanitized back + provided label", () => {
    expect(deriveBackLink({ back: "/schools/s1/coaches", label: "Coaches" })).toEqual({
      to: "/schools/s1/coaches",
      text: "Back to Coaches",
    });
  });

  it("defaults to All Coaches when query is absent", () => {
    expect(deriveBackLink({})).toEqual({ to: "/coaches", text: "Back to All Coaches" });
  });

  it("sanitizes an open-redirect back value and falls back", () => {
    expect(deriveBackLink({ back: "//evil.com", label: "X" })).toEqual({
      to: "/coaches",
      text: "Back to X",
    });
  });

  it("ignores array-valued query (defensive)", () => {
    expect(deriveBackLink({ back: ["/a", "/b"], label: ["x"] })).toEqual({
      to: "/coaches",
      text: "Back to All Coaches",
    });
  });
});
