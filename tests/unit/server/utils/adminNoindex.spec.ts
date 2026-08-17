import { describe, it, expect } from "vitest";
import { shouldNoindexHost } from "~/server/utils/adminNoindex";

const admin = "admin.myrecruitingcompass.com";

describe("shouldNoindexHost", () => {
  it("flags the admin host", () => {
    expect(shouldNoindexHost("admin.myrecruitingcompass.com", admin)).toBe(
      true,
    );
  });

  it("ignores the main host", () => {
    expect(shouldNoindexHost("myrecruitingcompass.com", admin)).toBe(false);
  });

  it("normalizes a trailing FQDN dot on either side", () => {
    expect(shouldNoindexHost("admin.myrecruitingcompass.com.", admin)).toBe(
      true,
    );
    expect(
      shouldNoindexHost("admin.myrecruitingcompass.com", `${admin}.`),
    ).toBe(true);
  });

  it("ignores a :port suffix on the request host", () => {
    expect(shouldNoindexHost("admin.myrecruitingcompass.com:443", admin)).toBe(
      true,
    );
  });

  it("is case-insensitive", () => {
    expect(shouldNoindexHost("ADMIN.MyRecruitingCompass.com", admin)).toBe(
      true,
    );
  });

  it("returns false for an empty host", () => {
    expect(shouldNoindexHost("", admin)).toBe(false);
  });
});
