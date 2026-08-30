import { describe, expect, it } from "vitest";
import {
  createEmptySearchFilters,
  isFilterValueActive,
  isSearchFiltering,
  readFilterValue,
} from "~/domain/search";

describe("domain/search filters", () => {
  it("treats empty/zero/false/null as inactive", () => {
    expect(isFilterValueActive("")).toBe(false);
    expect(isFilterValueActive(0)).toBe(false);
    expect(isFilterValueActive(false)).toBe(false);
    expect(isFilterValueActive(null)).toBe(false);
    expect(isFilterValueActive("D1")).toBe(true);
    expect(isFilterValueActive(100)).toBe(true);
  });

  it("reports filtering true by default because metrics.maxValue is 100", () => {
    expect(isSearchFiltering(createEmptySearchFilters())).toBe(true);
  });

  it("reads a missing filter as null via || null", () => {
    const filters = createEmptySearchFilters();
    expect(readFilterValue(filters, "schools", "division")).toBeNull();
    filters.schools.division = "D1";
    expect(readFilterValue(filters, "schools", "division")).toBe("D1");
  });
});
