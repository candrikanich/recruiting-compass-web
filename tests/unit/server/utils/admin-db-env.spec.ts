import { describe, it, expect } from "vitest";
import { resolveAdminDbEnv } from "~/server/utils/adminDbEnv";

describe("resolveAdminDbEnv", () => {
  it("defaults to prod when unset", () => {
    expect(resolveAdminDbEnv(undefined)).toBe("prod");
    expect(resolveAdminDbEnv(null)).toBe("prod");
    expect(resolveAdminDbEnv("")).toBe("prod");
  });

  it("passes through valid values", () => {
    expect(resolveAdminDbEnv("prod")).toBe("prod");
    expect(resolveAdminDbEnv("qa")).toBe("qa");
  });

  it("rejects anything else as a 400", () => {
    expect(() => resolveAdminDbEnv("staging")).toThrow();
    expect(() => resolveAdminDbEnv("QA")).toThrow();
  });
});
