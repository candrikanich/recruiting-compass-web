import { describe, it, expect } from "vitest";
import { canonicalizeOrigin } from "~/server/utils/requestOrigin";

describe("canonicalizeOrigin", () => {
  it("rewrites the prod admin host to its public host", () => {
    expect(
      canonicalizeOrigin(
        "https://admin.myrecruitingcompass.com",
        "admin.myrecruitingcompass.com",
      ),
    ).toBe("https://myrecruitingcompass.com");
  });

  it("rewrites a QA admin host to its public host", () => {
    expect(
      canonicalizeOrigin(
        "https://admin.qa.myrecruitingcompass.com",
        "admin.qa.myrecruitingcompass.com",
      ),
    ).toBe("https://qa.myrecruitingcompass.com");
  });

  it("leaves an ordinary public host untouched", () => {
    expect(
      canonicalizeOrigin(
        "https://myrecruitingcompass.com",
        "admin.myrecruitingcompass.com",
      ),
    ).toBe("https://myrecruitingcompass.com");
  });

  it("leaves a preview/loopback host untouched", () => {
    expect(canonicalizeOrigin("http://localhost:3003", "localhost:3003")).toBe(
      "http://localhost:3003",
    );
    expect(
      canonicalizeOrigin(
        "https://recruiting-compass-web-git-feature.vercel.app",
        "admin.myrecruitingcompass.com",
      ),
    ).toBe("https://recruiting-compass-web-git-feature.vercel.app");
  });

  it("normalizes a trailing FQDN dot and case on either side", () => {
    expect(
      canonicalizeOrigin(
        "https://ADMIN.myrecruitingcompass.com.",
        "admin.myrecruitingcompass.com",
      ),
    ).toBe("https://myrecruitingcompass.com");
  });

  it("preserves a non-default port on the rewritten host", () => {
    expect(
      canonicalizeOrigin(
        "https://admin.myrecruitingcompass.com:8443",
        "admin.myrecruitingcompass.com:8443",
      ),
    ).toBe("https://myrecruitingcompass.com:8443");
  });

  it("is a no-op when adminHost is empty", () => {
    expect(canonicalizeOrigin("https://myrecruitingcompass.com", "")).toBe(
      "https://myrecruitingcompass.com",
    );
  });
});
