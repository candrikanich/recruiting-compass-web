import { describe, it, expect } from "vitest";
import { extractQueryResult, requireQueryResult } from "~/utils/supabase/query";

describe("extractQueryResult", () => {
  it("returns data when query succeeds with array result", () => {
    const response = { data: [{ id: "1", name: "Ohio State" }], error: null };
    const result = extractQueryResult(response);
    expect(result).toEqual([{ id: "1", name: "Ohio State" }]);
  });

  it("returns null when data is null and no error", () => {
    const response = { data: null, error: null };
    const result = extractQueryResult(response);
    expect(result).toBeNull();
  });

  it("throws with error message when query returns an error", () => {
    const response = { data: null, error: { message: "relation not found", code: "PGRST" } };
    expect(() => extractQueryResult(response)).toThrow("relation not found");
  });

  it("handles single object result", () => {
    const response = { data: { id: "1", name: "Test" }, error: null };
    const result = extractQueryResult(response);
    expect(result).toEqual({ id: "1", name: "Test" });
  });
});

describe("requireQueryResult", () => {
  it("returns data when present", () => {
    const response = { data: { id: "1" }, error: null };
    const result = requireQueryResult(response);
    expect(result).toEqual({ id: "1" });
  });

  it("throws when data is null", () => {
    const response = { data: null, error: null };
    expect(() => requireQueryResult(response, "School")).toThrow("School not found");
  });

  it("uses default entity name when not provided", () => {
    const response = { data: null, error: null };
    expect(() => requireQueryResult(response)).toThrow("record not found");
  });

  it("throws error message when error present (not null data message)", () => {
    const response = { data: null, error: { message: "permission denied" } };
    expect(() => requireQueryResult(response)).toThrow("permission denied");
  });
});
