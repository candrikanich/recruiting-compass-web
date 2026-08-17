import { describe, it, expect } from "vitest";
import { safeInternalPath } from "~/utils/safeInternalPath";

describe("safeInternalPath", () => {
  it("returns a valid single-slash internal path unchanged", () => {
    expect(safeInternalPath("/schools/abc/coaches")).toBe(
      "/schools/abc/coaches",
    );
    expect(safeInternalPath("/coaches")).toBe("/coaches");
  });

  it("preserves an internal path's own query/hash", () => {
    expect(safeInternalPath("/schools/1/coaches?x=1")).toBe(
      "/schools/1/coaches?x=1",
    );
  });

  it("falls back for protocol-relative and absolute URLs (open-redirect vectors)", () => {
    expect(safeInternalPath("//evil.com")).toBe("/coaches");
    expect(safeInternalPath("https://evil.com")).toBe("/coaches");
    expect(safeInternalPath("http:/evil.com")).toBe("/coaches");
    expect(safeInternalPath("/\\evil.com")).toBe("/coaches");
  });

  it("falls back for non-slash, empty, and non-string input", () => {
    expect(safeInternalPath("coaches")).toBe("/coaches");
    expect(safeInternalPath("")).toBe("/coaches");
    expect(safeInternalPath(undefined)).toBe("/coaches");
    expect(safeInternalPath(["/a", "/b"])).toBe("/coaches");
    expect(safeInternalPath(42)).toBe("/coaches");
  });

  it("honors a custom fallback", () => {
    expect(safeInternalPath("//evil.com", "/home")).toBe("/home");
  });
});
